const supabaseUrl = '{{ .Site.Params.analytics.supabase.url }}';
const supabaseKey = '{{ .Site.Params.analytics.supabase.anon_key }}';

async function supabaseRpc(fnName, args) {
    if (supabaseUrl.includes('YOUR_PROJECT_REF')) return;
    try {
        await fetch(`${supabaseUrl}/rest/v1/rpc/${fnName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify(args)
        });
    } catch (e) {
        console.error('Supabase RPC Error:', e);
    }
}

async function supabaseSelect(table, query = '') {
    if (supabaseUrl.includes('YOUR_PROJECT_REF')) return [];
    try {
        const res = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        return await res.json();
    } catch (e) {
        console.error('Supabase Select Error:', e);
        return [];
    }
}

// 1. UV / Country Tracking
async function trackUV() {
    const uvKey = 'analytics_uv_tracked';
    const lastTracked = localStorage.getItem(uvKey);
    const now = Date.now();
    // 24 hours
    if (!lastTracked || now - parseInt(lastTracked) > 24 * 60 * 60 * 1000) {
        try {
            const geoRes = await fetch('https://get.geojs.io/v1/ip/geo.json');
            const geo = await geoRes.json();
            const country = geo.country || 'Unknown';
            await supabaseRpc('increment_country_visitor', { country: country });
            localStorage.setItem(uvKey, now.toString());
        } catch (e) {
            console.error('GeoIP Error:', e);
        }
    }
}

// 2. PV Tracking (Strict: 5s delay + scroll)
function trackPV() {
    if (typeof window.ARTICLE_SLUG === 'undefined') return;
    const slug = window.ARTICLE_SLUG;
    const pvKey = 'analytics_pv_' + slug;
    
    let hasScrolled = false;
    window.addEventListener('scroll', () => { hasScrolled = true; }, { once: true });

    setTimeout(async () => {
        const lastTracked = localStorage.getItem(pvKey);
        const now = Date.now();
        // If not tracked in 24h, AND user has scrolled
        if ((!lastTracked || now - parseInt(lastTracked) > 24 * 60 * 60 * 1000) && hasScrolled) {
            await supabaseRpc('increment_page_view', { page_slug: slug });
            localStorage.setItem(pvKey, now.toString());
        }
    }, 5000);
}

// 3. Render Data
async function renderStats() {
    if (supabaseUrl.includes('YOUR_PROJECT_REF')) return;

    // A. Render Sidebar Countries
    const sidebarContainer = document.getElementById('supabase_countries_container');
    if (sidebarContainer) {
        const countries = await supabaseSelect('visitor_countries', 'select=*&order=visitors.desc');
        if (countries && countries.length > 0) {
            const totalUV = countries.reduce((sum, row) => sum + row.visitors, 0);
            
            // Top 3
            const top3 = countries.slice(0, 3);
            let html = `<div style="font-size: 0.85rem; padding: 10px 20px;">
                <div style="margin-bottom: 5px; font-weight: bold; color: var(--body-text-color);">总访客数: ${totalUV}</div>
                <div style="color: var(--body-text-color);">访客分布 (Top 3):</div>`;
            
            top3.forEach(c => {
                html += `<div style="margin-left: 10px; opacity: 0.8;">- ${c.country_name}: ${c.visitors}</div>`;
            });

            // Dropdown for the rest
            if (countries.length > 3) {
                html += `
                <details style="margin-top: 5px;">
                    <summary style="cursor: pointer; opacity: 0.7; font-size: 0.8rem;">展开全部国家</summary>
                    <div style="margin-top: 5px; max-height: 150px; overflow-y: auto;">
                `;
                countries.slice(3).forEach(c => {
                    html += `<div style="margin-left: 10px; opacity: 0.8;">- ${c.country_name}: ${c.visitors}</div>`;
                });
                html += `</div></details>`;
            }
            html += `</div>`;
            sidebarContainer.innerHTML = html;
        }
    }

    // B. Render PVs (Homepage + Article)
    const pvElements = document.querySelectorAll('.supabase_pv_value');
    if (pvElements.length > 0) {
        const pvs = await supabaseSelect('page_views', 'select=*');
        const pvMap = {};
        if (pvs) {
            pvs.forEach(row => { pvMap[row.slug] = row.views; });
        }
        
        pvElements.forEach(el => {
            const slug = el.getAttribute('data-slug');
            el.innerText = pvMap[slug] || 0;
        });
    }
}

// Init
document.addEventListener("DOMContentLoaded", () => {
    trackUV();
    trackPV();
    renderStats();
});
