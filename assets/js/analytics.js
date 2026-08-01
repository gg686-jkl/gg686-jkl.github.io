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
            let html = `
            <div class="supabase-stats-card">
                <div class="stats-header">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                    <span>总访客: ${totalUV}</span>
                </div>
                <div style="font-size: 0.75rem; margin-bottom: 8px; color: var(--accent-color);">访客分布 (Top 3)</div>`;
            
            top3.forEach(c => {
                html += `
                <div class="stats-item">
                    <span>${c.country_name}</span>
                    <span>${c.visitors}</span>
                </div>`;
            });

            // Dropdown for the rest
            if (countries.length > 3) {
                html += `
                <details>
                    <summary>展开全部地区</summary>
                    <div class="details-content">
                `;
                countries.slice(3).forEach(c => {
                    html += `
                    <div class="stats-item">
                        <span>${c.country_name}</span>
                        <span>${c.visitors}</span>
                    </div>`;
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
            const views = pvMap[slug] || 0;
            // Inject new HTML
            const parent = el.parentElement;
            if (parent && !parent.classList.contains('article-stats-container')) {
                const wrapper = document.createElement('span');
                wrapper.className = 'article-stats-container';
                wrapper.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    阅读量: ${views}
                `;
                parent.replaceChild(wrapper, el);
            } else {
                el.innerText = views;
            }
        });
    }
}

// Init
document.addEventListener("DOMContentLoaded", () => {
    trackUV();
    trackPV();
    renderStats();
});
