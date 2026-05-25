---
title: Overleaf + LaTeX 入门到精通
published: true
---

### 本来是想着自己写一篇关于Overleaf + LaTeX的教程的，不过在收集资料的过程中看到了一篇大佬博客让我放弃了这个想法，在此推荐大家可以直接看他的博客，我在此仅补充一些踩过的坑

这个工具配置方面很简单，主要是学语法，但语法也很难说一次性学完，还是要多用，想要实现什么功能就回来查语法。
### 大佬连接附上：[膜拜大佬](https://blog.csdn.net/ayaishere_/article/details/123332393)
### 踩过的一些坑

* 坑一：
Overleaf本身是只支持英文的，所以直接输入中文就会报错

* 解：
在Overleaf文件编辑页面中点击菜单
![在这里插入图片描述](https://i-blog.csdnimg.cn/direct/542a7c49072f4eccba9bb86e29cdd67d.png)
然后将Compiler（编译器）改为`XeLaTeX`或者`LuaLaTeX`，接着在导言区放这行代码`\usepackage{ctex}`导入中文包，然后点击重新编译就行啦

* 坑二：
图片插入位置有误

* 解：
在编辑区插入图片的代码处加上[H]，固定图片位置
![在这里插入图片描述](https://i-blog.csdnimg.cn/direct/351a1c3437e3435384b2259796f4aad6.png)



后续有坑也会继续补充

# <center>Enjoy</center>
