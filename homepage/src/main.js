import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Observer } from 'gsap/Observer'
import Lenis from 'lenis'

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger, Observer)

// ========================================
// 环境配置 - 部署时通过环境变量设置
// ========================================
const CONFIG = {
  // API 后端地址
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  // Dashboard 前端地址
  DASHBOARD_URL: import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:3000',
}

// 动态替换 HTML 中的硬编码链接
function initDynamicLinks() {
  const dashboardUrl = CONFIG.DASHBOARD_URL
  
  // 替换所有 href 属性中的 localhost:3000
  document.querySelectorAll('a[href*="localhost:3000"]').forEach(link => {
    link.href = link.href.replace('http://localhost:3000', dashboardUrl)
  })
  
  // 替换所有 data-href 属性中的 localhost:3000
  document.querySelectorAll('[data-href*="localhost:3000"]').forEach(el => {
    el.dataset.href = el.dataset.href.replace('http://localhost:3000', dashboardUrl)
  })
}

// ========================================
// Global State
// ========================================
const state = {
  isLoaded: false,
  isDark: true,
  scrollPosition: 0,
  pendingNavigationUrl: null  // 待跳转的URL（漩涡坍缩后跳转）
}

// ========================================
// Lenis Smooth Scroll
// ========================================
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  direction: 'vertical',
  gestureDirection: 'vertical',
  smooth: true,
  smoothTouch: false,
  touchMultiplier: 2
})

function raf(time) {
  lenis.raf(time)
  requestAnimationFrame(raf)
}

requestAnimationFrame(raf)

// Connect Lenis to ScrollTrigger
lenis.on('scroll', ScrollTrigger.update)

gsap.ticker.add((time) => {
  lenis.raf(time * 1000)
})

gsap.ticker.lagSmoothing(0)

// ========================================
// Loader Animation - 仿cosmos风格
// ========================================
function initLoader() {
  const loader = document.getElementById('loader')
  const loaderBg = document.getElementById('loaderBg')
  const percentage = document.getElementById('loaderPercentage')
  const reveal = document.getElementById('loaderReveal')
  const heroTitle = document.querySelector('.hero__title')
  const heroSubtitle = document.querySelector('.hero__subtitle')
  
  // 初始状态：标题灰色
  if (heroTitle) heroTitle.classList.add('loading')
  if (heroSubtitle) heroSubtitle.classList.add('loading')
  
  // 需要预加载的漩涡图片
  const imageUrls = [
    './vortex-images/IMG_3795.JPG',
    './vortex-images/IMG_3796.WEBP',
    './vortex-images/IMG_3797.WEBP',
    './vortex-images/IMG_3798.WEBP',
    './vortex-images/IMG_3799.WEBP',
    './vortex-images/IMG_3801.WEBP',
    './vortex-images/IMG_3802.jpg',
    './vortex-images/IMG_3803.jpg',
    './vortex-images/IMG_3804.JPG',
    './vortex-images/IMG_3805.JPG',
    './vortex-images/IMG_3806.jpg',
    './vortex-images/IMG_3807.jpg',
    './vortex-images/IMG_3808.jpg',
    './vortex-images/IMG_3809.jpg',
    './vortex-images/IMG_3810.jpg',
    './vortex-images/IMG_3811.jpg',
    './vortex-images/IMG_3812.jpg',
    './vortex-images/IMG_3813.jpg',
    './vortex-images/IMG_3814.jpg',
    './vortex-images/IMG_3815.jpg',
    './vortex-images/IMG_3816.jpg',
    './vortex-images/IMG_3817.jpg',
    './vortex-images/IMG_3818.jpg',
    './vortex-images/IMG_3819.jpg',
    './vortex-images/IMG_3820.jpg',
    './vortex-images/IMG_3822.jpg',
    './vortex-images/IMG_3823.jpg',
    './vortex-images/IMG_3824.jpg',
    './vortex-images/IMG_3825.jpg',
    './vortex-images/IMG_3826.jpg',
    './vortex-images/IMG_3827.jpg',
    './vortex-images/IMG_3828.jpg',
    './vortex-images/IMG_3829.jpg',
    './vortex-images/IMG_3830.jpg',
    './vortex-images/IMG_3831.jpg',
    './vortex-images/IMG_3832.jpg',
    './vortex-images/IMG_3833.jpg',
    './vortex-images/IMG_3834.jpg',
    './vortex-images/IMG_3835.jpg',
    './vortex-images/IMG_3836.jpg',
    './vortex-images/IMG_3837.jpg',
    './vortex-images/IMG_3838.jpg',
  ]
  
  let loadedCount = 0
  const totalImages = imageUrls.length
  
  // 预加载单张图片
  function preloadImage(url) {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        loadedCount++
        updateProgress()
        resolve()
      }
      img.onerror = () => {
        loadedCount++
        updateProgress()
        resolve() // 即使加载失败也继续
      }
      img.src = url
    })
  }
  
  // 更新进度显示
  function updateProgress() {
    const progress = Math.floor((loadedCount / totalImages) * 100)
    percentage.textContent = `${progress}%`
  }
  
  // 加载完成后的过渡动画
  function onLoadComplete() {
    // 稍微延迟让用户看到100%
    setTimeout(() => {
      // 隐藏百分比
      gsap.to(percentage, { opacity: 0, duration: 0.5 })
      
      // 触发黑色晕染扩散动画
      reveal.classList.add('expanding')
      
      // 晕染扩散开始后，标题颜色从灰色渐变到白色
      setTimeout(() => {
        if (heroTitle) {
          heroTitle.classList.remove('loading')
          heroTitle.classList.add('loaded')
        }
        if (heroSubtitle) {
          heroSubtitle.classList.remove('loading')
          heroSubtitle.classList.add('loaded')
        }
      }, 300)
      
      // 晕染扩散进行到一半时初始化页面动画（图片渐变淡入）
      setTimeout(() => {
        state.isLoaded = true
        initPageAnimations()
      }, 600)
      
      // 晕染扩散结束后隐藏加载器背景
      setTimeout(() => {
        loaderBg.classList.add('fade-out')
      }, 800)
      
      // 完全隐藏加载器
      setTimeout(() => {
        loader.classList.add('hidden')
      }, 1600)
    }, 400)
  }
  
  // 开始预加载所有图片
  Promise.all(imageUrls.map(preloadImage)).then(onLoadComplete)
}

// ========================================
// Cookie Notice
// ========================================
function initCookieNotice() {
  const notice = document.getElementById('cookieNotice')
  const acceptBtn = document.getElementById('cookieAccept')
  
  // Show after loader
  setTimeout(() => {
    notice.classList.add('visible')
  }, 3500)
  
  acceptBtn.addEventListener('click', () => {
    notice.classList.remove('visible')
    notice.classList.add('hidden')
  })
}

// ========================================
// Theme Toggle
// ========================================
function initThemeToggle() {
  const toggle = document.getElementById('themeToggle')
  const darkLabel = toggle.querySelector('.theme-toggle__label--dark')
  const lightLabel = toggle.querySelector('.theme-toggle__label--light')
  
  toggle.addEventListener('click', () => {
    state.isDark = !state.isDark
    document.body.classList.toggle('dark', state.isDark)
    document.body.classList.toggle('light', !state.isDark)
    
    darkLabel.classList.toggle('active', state.isDark)
    lightLabel.classList.toggle('active', !state.isDark)
  })
}

// ========================================
// Scroll Hint
// ========================================
function initScrollHint() {
  const hint = document.getElementById('scrollHint')
  
  // Hide on scroll
  lenis.on('scroll', ({ scroll }) => {
    if (scroll > 100) {
      hint.classList.add('hidden')
    } else {
      hint.classList.remove('hidden')
    }
  })
  
  // Scroll down on click
  hint.addEventListener('click', () => {
    lenis.scrollTo('#sectionGallery', { duration: 1.5 })
  })
}

// ========================================
// Header Animation
// ========================================
function initHeader() {
  const header = document.getElementById('header')
  let lastScroll = 0
  
  lenis.on('scroll', ({ scroll }) => {
    if (scroll > lastScroll && scroll > 200) {
      header.classList.add('hidden')
    } else {
      header.classList.remove('hidden')
    }
    lastScroll = scroll
  })
}

// ========================================
// Navigation with Vortex Transition (导航转场效果)
// ========================================
// 暴露到全局，供 initFloatingImages 中的 collapseAll 使用
let triggerNavigationCollapse = null

function initNavigation() {
  // 所有需要转场效果的导航链接
  const transitionLinks = document.querySelectorAll('[data-nav-transition]')
  // 滚动链接（不离开页面）
  const scrollLinks = document.querySelectorAll('[data-nav-scroll]')
  // 首页链接
  const homeLinks = document.querySelectorAll('[data-nav-home]')
  // 登出链接
  const logoutLinks = document.querySelectorAll('[data-nav-logout]')
  
  // 处理转场导航
  transitionLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault()
      const targetUrl = link.getAttribute('href')
      
      // 如果当前在hero区域，触发漩涡坍缩转场
      const hero = document.getElementById('hero')
      const heroRect = hero.getBoundingClientRect()
      const isInHeroView = heroRect.top <= window.innerHeight && heroRect.bottom >= 0
      
      if (isInHeroView && triggerNavigationCollapse) {
        // 设置待跳转URL
        state.pendingNavigationUrl = targetUrl
        // 触发漩涡坍缩，传入 true 表示这是导航触发的
        const collapseStarted = triggerNavigationCollapse(true)
        
        // 如果坍缩没有成功触发（已经坍缩状态），直接跳转
        if (collapseStarted === false) {
          window.location.href = targetUrl
        }
      } else {
        // 不在hero区域或没有漩涡，直接跳转（可以添加普通淡出效果）
        document.body.classList.add('page-transitioning')
        gsap.to('main', {
          opacity: 0,
          y: -30,
          duration: 0.4,
          ease: 'power2.in',
          onComplete: () => {
            window.location.href = targetUrl
          }
        })
      }
    })
  })
  
  // 处理滚动链接（页内跳转）
  scrollLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault()
      const targetId = link.getAttribute('href')
      const target = document.querySelector(targetId)
      if (target) {
        lenis.scrollTo(target, { duration: 1.5 })
      }
    })
  })
  
  // 处理首页链接
  homeLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault()
      // 如果已经在首页，滚动到顶部
      lenis.scrollTo(0, { duration: 1 })
    })
  })
  
  // 处理登出
  logoutLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault()
      // 这里可以添加登出逻辑
      // 目前先跳转到登录页
      if (confirm('确定要退出登录吗？')) {
        const loginUrl = `${CONFIG.DASHBOARD_URL}/login`
        state.pendingNavigationUrl = loginUrl
        if (triggerNavigationCollapse) {
          const collapseStarted = triggerNavigationCollapse(true)
          if (collapseStarted === false) {
            window.location.href = loginUrl
          }
        } else {
          window.location.href = loginUrl
        }
      }
    })
  })
}

// ========================================
// Dropdown Menu (更多下拉菜单)
// ========================================
function initDropdownMenu() {
  const dropdown = document.getElementById('headerDropdown')
  const trigger = document.getElementById('dropdownTrigger')
  const menu = document.getElementById('dropdownMenu')
  
  if (!dropdown || !trigger || !menu) return
  
  // 点击触发器切换菜单
  trigger.addEventListener('click', (e) => {
    e.stopPropagation()
    dropdown.classList.toggle('is-open')
  })
  
  // 点击菜单项时关闭菜单
  menu.querySelectorAll('.header__dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
      dropdown.classList.remove('is-open')
    })
  })
  
  // 点击外部关闭菜单
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove('is-open')
    }
  })
  
  // ESC 键关闭菜单
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      dropdown.classList.remove('is-open')
    }
  })
}

// ========================================
// Vortex Images (Hero) - 6条圆弧队列漩涡效果 (仿cosmos.so)
// ========================================
function initFloatingImages() {
  const container = document.getElementById('vortexContainer')
  if (!container) return
  
  const hero = document.getElementById('hero')
  const heroContent = document.querySelector('.hero__content')
  let centerX = window.innerWidth / 2
  let centerY = window.innerHeight / 2
  
  // 更新中心点
  function updateCenter() {
    centerX = window.innerWidth / 2
    centerY = window.innerHeight / 2
  }
  window.addEventListener('resize', updateCenter)
  
  // 使用本地素材图片
  const imageUrls = [
    './vortex-images/IMG_3795.JPG',
    './vortex-images/IMG_3796.WEBP',
    './vortex-images/IMG_3797.WEBP',
    './vortex-images/IMG_3798.WEBP',
    './vortex-images/IMG_3799.WEBP',
    './vortex-images/IMG_3801.WEBP',
    './vortex-images/IMG_3802.jpg',
    './vortex-images/IMG_3803.jpg',
    './vortex-images/IMG_3804.JPG',
    './vortex-images/IMG_3805.JPG',
    './vortex-images/IMG_3806.jpg',
    './vortex-images/IMG_3807.jpg',
    './vortex-images/IMG_3808.jpg',
    './vortex-images/IMG_3809.jpg',
    './vortex-images/IMG_3810.jpg',
    './vortex-images/IMG_3811.jpg',
    './vortex-images/IMG_3812.jpg',
    './vortex-images/IMG_3813.jpg',
    './vortex-images/IMG_3814.jpg',
    './vortex-images/IMG_3815.jpg',
    './vortex-images/IMG_3816.jpg',
    './vortex-images/IMG_3817.jpg',
    './vortex-images/IMG_3818.jpg',
    './vortex-images/IMG_3819.jpg',
    './vortex-images/IMG_3820.jpg',
    './vortex-images/IMG_3822.jpg',
    './vortex-images/IMG_3823.jpg',
    './vortex-images/IMG_3824.jpg',
    './vortex-images/IMG_3825.jpg',
    './vortex-images/IMG_3826.jpg',
    './vortex-images/IMG_3827.jpg',
    './vortex-images/IMG_3828.jpg',
    './vortex-images/IMG_3829.jpg',
    './vortex-images/IMG_3830.jpg',
    './vortex-images/IMG_3831.jpg',
    './vortex-images/IMG_3832.jpg',
    './vortex-images/IMG_3833.jpg',
    './vortex-images/IMG_3834.jpg',
    './vortex-images/IMG_3835.jpg',
    './vortex-images/IMG_3836.jpg',
    './vortex-images/IMG_3837.jpg',
    './vortex-images/IMG_3838.jpg'
  ]
  
  // 漩涡配置 - 6条堆叠队列 (仿cosmos.so)
  const config = {
    numQueues: 6,           // 6条队列
    imagesPerQueue: 8,      // 每条队列8张图片（更密集）
    baseRadius: Math.min(window.innerWidth, window.innerHeight) * 0.52, // 基础半径
    stackOffset: 6,         // 堆叠时图片之间的偏移量（非常紧凑）
    speed: 1.5,            // 移动速度（大幅加快）
    baseImageWidth: 85,     // 基础图片宽度（更小）
    baseImageHeight: 145    // 基础图片高度
  }
  
  // 响应式更新
  window.addEventListener('resize', () => {
    config.baseRadius = Math.min(window.innerWidth, window.innerHeight) * 0.42
    updateCenter()
  })
  
  // 漩涡状态
  const vortexState = {
    queues: [],
    isCollapsed: false,
    animationId: null,
    isAnimating: true
  }
  
  // 单张图片类 - 沿圆弧排列，队列内图片沿圆弧方向移动
  class ArcQueueImage {
    constructor(queueIndex, positionInQueue, queueCenterAngle) {
      this.queueIndex = queueIndex
      this.positionInQueue = positionInQueue
      this.queueCenterAngle = queueCenterAngle  // 队列中心角度
      
      // 圆弧覆盖范围 - 每个队列占据的角度范围
      this.arcSpan = Math.PI / 5  // 36度的弧
      
      // 在圆弧上的位置进度 (0 = 圆弧末端/外侧, 1 = 重置点)
      // 图片从圆弧末端向中心移动
      // 使用非线性分布：外围密集，内侧稀疏（后方图片更紧凑）
      const linearProgress = positionInQueue / config.imagesPerQueue
      // 使用平方根让外围（小值）更密集，范围调整到0-0.95
      this.arcProgress = Math.pow(linearProgress, 0.6) * 0.95
      
      // 基础尺寸
      this.baseWidth = config.baseImageWidth
      this.baseHeight = config.baseImageHeight
      
      // 随机选择图片
      this.imageIndex = Math.floor(Math.random() * imageUrls.length)
      
      // 旋转角度 - 轻微随机倾斜
      this.rotation = (Math.random() - 0.5) * 15
      
      // 淡入进度 - 初始为负值，实现渐进淡入效果
      // 外围图片先淡入，内侧图片后淡入（更长的延迟，更慢的淡入）
      const delayFactor = (config.imagesPerQueue - 1 - positionInQueue) * 0.25 + queueIndex * 0.08
      this.fadeInProgress = -delayFactor - 0.5  // 额外延迟0.5
      
      // 创建DOM元素
      this.element = document.createElement('div')
      this.element.className = 'vortex-image'
      
      const inner = document.createElement('div')
      inner.className = 'vortex-image__inner'
      inner.style.backgroundImage = `url(${imageUrls[this.imageIndex]})`
      
      this.element.appendChild(inner)
      
      container.appendChild(this.element)
      
      // 初始透明度为0（等待淡入）
      this.opacity = 0
      
      this.render()
    }
    
    // 计算当前角度 - 基于在圆弧上的位置（大幅度圆弧移动）
    getCurrentAngle() {
      // arcProgress 0 = 圆弧外侧（角度偏移大）
      // arcProgress 1 = 圆弧内侧/中心（角度偏移小）
      // 增大圆弧覆盖范围，让横向移动更明显
      const largeArcSpan = Math.PI / 2.5  // 增大到72度的弧，更明显的圆弧运动
      const angleOffset = (1 - this.arcProgress) * largeArcSpan - largeArcSpan / 2
      return this.queueCenterAngle + angleOffset
    }
    
    // 缓动函数 - 极强加速（指数级）
    easeInExpo(t) {
      return t === 0 ? 0 : Math.pow(2, 10 * t - 10)  // 指数级加速，非常戏剧化
    }
    
    // 缓动函数 - 极强加速（大幅提高加速度）
    easeInSuperExpo(t) {
      // 使用更高次幂，提供极强的加速效果
      return Math.pow(t, 6)  // t^6 提供极强加速
    }
    
    // 计算当前半径 - 连续向中心螺旋（极强加速收缩）
    getCurrentRadius() {
      // 从外圈到中心的连续螺旋
      // arcProgress 0 -> 最大半径
      // arcProgress 1 -> 最小半径（接近中心消失）
      const maxRadius = config.baseRadius * 1.3  // 增大外围半径
      const minRadius = 0  // 最终收缩到0
      
      // 使用指数级加速（开始几乎静止，结束极速冲向中心）
      const easeProgress = this.easeInExpo(this.arcProgress)
      return maxRadius - easeProgress * (maxRadius - minRadius)
    }
    
    // 计算当前缩放 - 外侧大，内侧小，极强加速缩小
    getCurrentScale() {
      // 连续缩放：外侧 1.0 -> 内侧 0（消失）
      const maxScale = 1.0
      const minScale = 0.01  // 最终缩小到几乎看不见
      
      // 使用超级指数加速让缩放更戏剧化（更快变小）
      const easeProgress = this.easeInSuperExpo(this.arcProgress)
      return maxScale - easeProgress * (maxScale - minScale)
    }
    
    // 计算透明度 - 外围非常透明，最大70%透明度
    getCurrentOpacity() {
      // 外围（arcProgress小）非常透明，向内逐渐变为70%透明度
      const maxOpacity = 0.63  // 最大透明度63%（降低10%）
      
      if (this.arcProgress < 0.03) {
        // 刚进入时快速淡入到很透明的状态
        return this.arcProgress / 0.03 * 0.15  // 淡入到0.15（极透明）
      } else if (this.arcProgress < 0.1) {
        // 从0.15逐渐变为0.3
        return 0.15 + (this.arcProgress - 0.03) / 0.07 * 0.15
      } else if (this.arcProgress < 0.4) {
        // 从0.3逐渐变为maxOpacity
        return 0.3 + (this.arcProgress - 0.1) / 0.3 * (maxOpacity - 0.3)
      } else {
        // 之后保持最大透明度，不淡出，只是缩小消失
        return maxOpacity
      }
    }
    
    update(deltaProgress) {
      // 增加圆弧进度（沿圆弧向中心移动）
      this.arcProgress += deltaProgress
      
      // 使用新的透明度计算（外围半透明，内侧实心，不淡出）
      this.opacity = this.getCurrentOpacity()
      
      // 如果进度超过1，图片到达中心，需要重置
      if (this.arcProgress >= 1) {
        return true  // 需要重置
      }
      
      this.render()
      return false
    }
    
    // 直接更新进度（用于同步控制）
    updateProgress(deltaProgress) {
      this.arcProgress += deltaProgress
      this.opacity = this.getCurrentOpacity()
      this.render()
    }
    
    render() {
      const angle = this.getCurrentAngle()
      const radius = this.getCurrentRadius()
      const scale = this.getCurrentScale()
      
      // 计算位置（沿圆弧）
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius
      
      // 根据缩放调整尺寸
      const width = this.baseWidth * scale
      const height = this.baseHeight * scale
      
      // Z-index - 外侧图片在上层
      const zIndex = Math.floor((1 - this.arcProgress) * 100) + this.queueIndex * 10
      
      // 应用变换
      this.element.style.width = `${width}px`
      this.element.style.height = `${height}px`
      this.element.style.transform = `
        translate(${x - width / 2}px, ${y - height / 2}px) 
        rotate(${this.rotation}deg)
      `
      this.element.style.opacity = this.opacity
      this.element.style.zIndex = zIndex
    }
    
    // 重置到圆弧末端，淡入新图片
    reset() {
      this.arcProgress = 0  // 从圆弧外侧重新开始
      this.opacity = 0
      this.rotation = (Math.random() - 0.5) * 15
      this.imageIndex = Math.floor(Math.random() * imageUrls.length)
      
      // 更换图片
      const inner = this.element.querySelector('.vortex-image__inner')
      inner.style.backgroundImage = `url(${imageUrls[this.imageIndex]})`
      
      this.render()
    }
    
    // 坍缩到中心
    collapse(delay = 0) {
      return gsap.to(this, {
        arcProgress: 1.5,
        opacity: 0,
        duration: 0.6 + delay,
        ease: 'power2.in',
        onUpdate: () => {
          const angle = this.getCurrentAngle()
          const radius = Math.max(0, config.baseRadius * (1 - this.arcProgress))
          const scale = Math.max(0.1, this.getCurrentScale())
          const x = centerX + Math.cos(angle) * radius
          const y = centerY + Math.sin(angle) * radius
          const width = this.baseWidth * scale
          const height = this.baseHeight * scale
          this.element.style.width = `${width}px`
          this.element.style.height = `${height}px`
          this.element.style.transform = `
            translate(${x - width / 2}px, ${y - height / 2}px) 
            rotate(${this.rotation}deg)
          `
          this.element.style.opacity = this.opacity
        }
      })
    }
    
    // 从中心展开
    expand(targetProgress, delay = 0) {
      this.progress = 1
      this.opacity = 0
      this.updateRadius()
      
      return gsap.to(this, {
        progress: targetProgress,
        opacity: 1,
        duration: 0.8,
        delay: delay,
        ease: 'power2.out',
        onUpdate: () => {
          this.updateRadius()
          const x = centerX + Math.cos(this.angle) * this.radius
          const y = centerY + Math.sin(this.angle) * this.radius
          const scale = 0.5 + (1 - this.progress) * 0.6
          this.element.style.transform = `
            translate(${x - this.baseWidth / 2}px, ${y - this.baseHeight / 2}px) 
            scale(${scale}) 
            rotate(${this.rotation}deg)
          `
          this.element.style.opacity = this.opacity
        }
      })
    }
  }
  
  // 队列类
  // 圆弧队列类
  class ArcQueue {
    constructor(queueIndex) {
      this.queueIndex = queueIndex
      this.images = []
      
      // 队列的中心角度（6条队列均匀分布在圆周上）
      this.centerAngle = (queueIndex / config.numQueues) * Math.PI * 2 - Math.PI / 2
      
      // 创建队列中的图片（沿圆弧排列）- 所有队列同步，无时间差
      for (let i = 0; i < config.imagesPerQueue; i++) {
        const img = new ArcQueueImage(queueIndex, i, this.centerAngle)
        // 更紧密的进度分布 - 图片之间间距更小
        // 只使用0-0.7的进度范围，让图片更集中在外围
        img.arcProgress = (i / config.imagesPerQueue) * 0.7
        img.render()
        this.images.push(img)
      }
    }
    
    update(speed, globalDeltaProgress) {
      // 使用全局进度增量，确保所有队列同步
      this.images.forEach((img) => {
        img.updateProgress(globalDeltaProgress)
      })
    }
    
    // 检查并重置到达中心的图片（由全局控制器调用）
    checkAndResetFrontImage() {
      const frontImage = this.images[0]
      if (frontImage && frontImage.arcProgress >= 1) {
        frontImage.reset()
        // 将重置的图片移到队列末尾
        this.images.push(this.images.shift())
        // 重新分配进度
        this.redistributeProgress()
        return true
      }
      return false
    }
    
    // 重新分配队列中图片的进度
    redistributeProgress() {
      this.images.forEach((img, i) => {
        // 保持相对间距
        img.arcProgress = (i / config.imagesPerQueue) * 0.7
        img.render()
      })
    }
    
    collapseAll(baseDelay = 0) {
      return this.images.map((img, i) => {
        const delay = baseDelay + i * 0.05
        return img.collapse(delay)
      })
    }
    
    expandAll(baseDelay = 0) {
      return this.images.map((img, i) => {
        const delay = baseDelay + i * 0.08
        img.animOffset = -config.arcSpan * 0.5
        img.opacity = 0
        return gsap.to(img, {
          animOffset: 0,
          opacity: 1,
          duration: 0.8,
          delay: delay,
          ease: 'power2.out',
          onUpdate: () => img.render()
        })
      })
    }
  }
  
  // 创建6条圆弧队列
  for (let i = 0; i < config.numQueues; i++) {
    vortexState.queues.push(new ArcQueue(i))
  }
  
  // 上一帧时间
  let lastTime = performance.now()
  
  // 坍缩状态
  let isCollapsing = false
  let collapseSpeed = 1 // 坍缩时的速度倍增器
  
  // 动画循环 - 边消失边生成
  function animate(currentTime) {
    // 计算基于时间的增量（确保速度稳定，不受帧率影响）
    const deltaTime = Math.min(currentTime - lastTime, 50) // 限制最大delta防止卡顿后跳跃
    lastTime = currentTime
    
    if (vortexState.isAnimating || isCollapsing) {
      // 坍缩模式：速度大幅增加，不重置图片
      const speedMultiplier = isCollapsing ? collapseSpeed : 1
      const globalDeltaProgress = config.speed * 0.00003 * deltaTime * speedMultiplier
      const spacing = 0.95 / config.imagesPerQueue
      
      // 第一阶段：更新所有图片的进度
      vortexState.queues.forEach(queue => {
        queue.images.forEach(img => {
          img.arcProgress += globalDeltaProgress
        })
      })
      
      // 第二阶段：处理需要重置的图片（仅在非坍缩模式）
      if (!isCollapsing) {
        vortexState.queues.forEach(queue => {
          let minProgress = Infinity
          queue.images.forEach(img => {
            if (img.arcProgress < 1 && img.arcProgress < minProgress) {
              minProgress = img.arcProgress
            }
          })
          
          if (minProgress === Infinity) {
            minProgress = 0
          }
          
          queue.images.forEach(img => {
            if (img.arcProgress >= 1) {
              img.arcProgress = minProgress - spacing * 1.5
              minProgress = img.arcProgress
              img.fadeInProgress = 0
              img.imageIndex = Math.floor(Math.random() * imageUrls.length)
              const inner = img.element.querySelector('.vortex-image__inner')
              inner.style.backgroundImage = `url(${imageUrls[img.imageIndex]})`
            }
          })
        })
      }
      
      // 第三阶段：渲染所有图片
      let allCollapsed = true
      vortexState.queues.forEach(queue => {
        queue.images.forEach(img => {
          // 处理淡入效果（仅在非坍缩模式）
          if (!isCollapsing && img.fadeInProgress !== undefined && img.fadeInProgress < 1) {
            img.fadeInProgress += 0.016  // 加快淡入速度
            img.fadeInProgress = Math.min(img.fadeInProgress, 1)
          }
          
          // 计算最终透明度
          let finalOpacity = img.getCurrentOpacity()
          if (!isCollapsing && img.fadeInProgress !== undefined && img.fadeInProgress < 1) {
            // 如果 fadeInProgress <= 0，完全透明（等待中）
            // 如果 fadeInProgress > 0 且 < 1，逐渐淡入
            finalOpacity *= Math.max(0, img.fadeInProgress)
          }
          
          // 坍缩时逐渐淡出
          if (isCollapsing && img.arcProgress > 0.7) {
            finalOpacity *= Math.max(0, 1 - (img.arcProgress - 0.7) / 0.5)
          }
          
          img.opacity = finalOpacity
          img.render()
          
          // 检查是否所有图片都坍缩完成
          if (img.arcProgress < 1.2) {
            allCollapsed = false
          }
        })
      })
      
      // 坍缩完成后执行转场
      if (isCollapsing && allCollapsed) {
        isCollapsing = false
        vortexState.isAnimating = false
        gsap.set(hero, { visibility: 'hidden' })
        lenis.start()
        
        // 检查是否有待跳转的URL
        if (state.pendingNavigationUrl) {
          const targetUrl = state.pendingNavigationUrl
          state.pendingNavigationUrl = null
          // 短暂延迟后跳转，让用户看到完整的坍缩效果
          setTimeout(() => {
            window.location.href = targetUrl
          }, 100)
        } else {
          // 默认行为：滚动到下一区域
          lenis.scrollTo('#sectionGallery', {
            duration: 0.01,
            immediate: true
          })
        }
      }
    }
    
    vortexState.animationId = requestAnimationFrame(animate)
  }
  
  // 立即启动动画（图片已在加载器中预加载完成）
  lastTime = performance.now()
  requestAnimationFrame(animate)
  
  // 坍缩转场动画 - 不再使用单独的GSAP动画，而是加速现有动画
  // forNavigation: 如果是导航触发的，且已经坍缩，返回 false 表示需要直接跳转
  function collapseAll(forNavigation = false) {
    if (vortexState.isCollapsed) {
      // 如果是导航触发的，返回 false 告诉调用者需要直接跳转
      return forNavigation ? false : undefined
    }
    vortexState.isCollapsed = true
    isCollapsing = true
    collapseSpeed = 25 // 25倍速冲向中心，更快结束
    
    // 禁用滚动
    lenis.stop()
    
    // COSMOS标题和内容也坍缩
    gsap.to(heroContent, {
      scale: 0,
      opacity: 0,
      duration: 0.5,
      ease: 'power3.in'
    })
    
    return true // 成功触发坍缩
  }
  
  // 暴露 collapseAll 到全局，供导航使用
  triggerNavigationCollapse = collapseAll
  
  // 展开动画（滚动回来时）
  function expandAll() {
    if (!vortexState.isCollapsed) return
    vortexState.isCollapsed = false
    isCollapsing = false
    
    gsap.set(hero, { visibility: 'visible' })
    lenis.scrollTo(0, { immediate: true })
    
    // 内容展开 - 无延迟
    gsap.to(heroContent, {
      scale: 1,
      opacity: 1,
      duration: 0.5,
      ease: 'power3.out'
    })
    
    // 重置所有图片到初始位置，并设置渐进淡入
    let imageIndex = 0
    vortexState.queues.forEach((queue, queueIdx) => {
      queue.images.forEach((img, i) => {
        // 重置到初始位置
        img.arcProgress = (i / config.imagesPerQueue) * 0.95
        // 设置淡入进度为负值，这样会有延迟淡入效果
        // 外围图片先淡入，内侧图片后淡入
        const delayFactor = (config.imagesPerQueue - 1 - i) * 0.15 + queueIdx * 0.05
        img.fadeInProgress = -delayFactor  // 负值表示延迟
        img.opacity = 0
        img.render()
        imageIndex++
      })
    })
    
    // 立即重新启动动画
    vortexState.isAnimating = true
    
    // 重置标语区域的动画状态
    resetOrderSectionAnimation()
  }
  
  // 防抖状态
  let canCollapse = true
  
  // 监听滚动
  Observer.create({
    target: hero,
    type: 'wheel,touch',
    onDown: () => {
      if (!vortexState.isCollapsed && canCollapse && !isCollapsing) {
        canCollapse = false
        collapseAll()
        // 防止短时间内多次触发
        setTimeout(() => { canCollapse = true }, 2000)
      }
    }
  })
  
  // 监听滚动位置，判断是否需要展开
  ScrollTrigger.create({
    trigger: '#sectionGallery',
    start: 'top bottom',
    end: 'top top',
    onLeaveBack: () => {
      expandAll()
    }
  })
  
  // 鼠标移动影响漩涡速度
  document.addEventListener('mousemove', (e) => {
    if (vortexState.isPaused) return
    
    const mouseX = (e.clientX / window.innerWidth - 0.5) * 2
    const mouseY = (e.clientY / window.innerHeight - 0.5) * 2
    const distance = Math.sqrt(mouseX * mouseX + mouseY * mouseY)
    
    // 鼠标靠近边缘时加速
    vortexState.speed = 1 + distance * 0.5
  })
  
  // 窗口大小改变时更新中心点
  window.addEventListener('resize', () => {
    const newCenterX = window.innerWidth / 2
    const newCenterY = window.innerHeight / 2
    // 更新会在下一帧自动应用
  })
}

// ========================================
// Rotating Text Animation
// ========================================
function initRotatingText() {
  const containers = ['rotatingText', 'rotatingText2']
  
  containers.forEach(containerId => {
    const container = document.getElementById(containerId)
    if (!container) return
    
    const words = container.querySelectorAll(containerId === 'rotatingText' ? '.hero__rotating-word' : '.section__rotating-word')
    let currentIndex = 0
    
    setInterval(() => {
      words[currentIndex].classList.remove('active')
      currentIndex = (currentIndex + 1) % words.length
      words[currentIndex].classList.add('active')
    }, 2500)
  })
}

// ========================================
// Split Text Animation
// ========================================
function initSplitText() {
  const titles = document.querySelectorAll('.split-text')
  
  titles.forEach(title => {
    const text = title.textContent
    title.innerHTML = ''
    
    // Split into words
    text.split(' ').forEach((word, wordIndex) => {
      const wordSpan = document.createElement('span')
      wordSpan.className = 'split-word'
      wordSpan.style.display = 'inline-block'
      wordSpan.style.overflow = 'hidden'
      wordSpan.style.marginRight = '0.3em'
      
      // Split word into characters
      word.split('').forEach(char => {
        const charSpan = document.createElement('span')
        charSpan.className = 'split-char'
        charSpan.textContent = char
        charSpan.style.display = 'inline-block'
        wordSpan.appendChild(charSpan)
      })
      
      title.appendChild(wordSpan)
    })
    
    // Animate on scroll
    ScrollTrigger.create({
      trigger: title,
      start: 'top 80%',
      onEnter: () => {
        gsap.to(title.querySelectorAll('.split-char'), {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.02,
          ease: 'expo.out'
        })
      },
      once: true
    })
  })
}

// ========================================
// AI Tags Animation
// ========================================
function initAITags() {
  const tags = document.querySelectorAll('.ai-tag')
  
  ScrollTrigger.create({
    trigger: '#sectionAI',
    start: 'top 60%',
    onEnter: () => {
      gsap.to(tags, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'expo.out'
      })
    },
    once: true
  })
}

// ========================================
// Typewriter Effect
// ========================================
function initTypewriter() {
  const chars = document.querySelectorAll('.search-preview__char')
  
  ScrollTrigger.create({
    trigger: '#sectionSearch',
    start: 'top 60%',
    onEnter: () => {
      chars.forEach((char, index) => {
        setTimeout(() => {
          char.classList.add('visible')
        }, index * 80)
      })
    },
    once: true
  })
}

// ========================================
// Gallery Items Animation
// ========================================
function initGalleryAnimation() {
  const items = document.querySelectorAll('.gallery__item')
  
  items.forEach((item, index) => {
    gsap.from(item, {
      opacity: 0,
      y: 50,
      scale: 0.95,
      scrollTrigger: {
        trigger: item,
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      duration: 0.8,
      delay: (index % 4) * 0.1,
      ease: 'expo.out'
    })
  })
}

// ========================================
// Galaxy Hemisphere Dome (3D Draggable with Cards) - 穹顶星云
// ========================================
function initStarfield() {
  const canvas = document.getElementById('starfieldCanvas')
  const galaxyContainer = document.getElementById('galaxyContainer')
  const cardsContainer = document.getElementById('clustersCarousel')
  
  if (!canvas || !galaxyContainer) return
  
  const ctx = canvas.getContext('2d')
  
  // Set canvas size
  function resize() {
    canvas.width = galaxyContainer.offsetWidth
    canvas.height = galaxyContainer.offsetHeight
  }
  resize()
  window.addEventListener('resize', resize)
  
  // Hemisphere dome parameters - 穹顶在上方
  const domeRadius = 900  // 更大的穹顶
  const numStars = 600  // 更少粒子
  const stars = []
  
  // Current rotation state
  let rotationX = 0  // Vertical rotation (pitch)
  let rotationY = 0  // Horizontal rotation (yaw)
  let targetRotationX = 0
  let targetRotationY = 0
  let isDragging = false
  let dragStartX = 0
  let dragStartY = 0
  let dragRotationX = 0
  let dragRotationY = 0
  
  // Create stars on hemisphere surface - 穹顶在上方（天空）
  for (let i = 0; i < numStars; i++) {
    // Use spherical coordinates for hemisphere distribution
    const theta = Math.random() * Math.PI * 2  // Azimuth angle (0 to 2π)
    const phi = Math.random() * Math.PI * 0.55  // Polar angle (0 to ~100° for upper hemisphere dome)
    
    // Convert to Cartesian coordinates - 穹顶在上方
    const x = domeRadius * Math.sin(phi) * Math.cos(theta)
    const y = -domeRadius * Math.cos(phi)  // 负Y = 向上（穹顶效果）
    const z = domeRadius * Math.sin(phi) * Math.sin(theta)
    
    stars.push({
      x, y, z,
      theta, phi,
      size: Math.random() * 2.0 + 1.0,  // 更大的粒子
      brightness: 1.0,  // 纯白最高亮度
      // 闪烁参数：2秒闪烁 + 3秒间隔 = 5秒周期
      twinkleOffset: Math.random() * 5  // 随机起始相位（0-5秒）
    })
  }
  
  // Card carousel state - 水平弧形队列，独立于星空旋转
  let cardOffset = 0  // 卡片队列的偏移量
  let cardTargetOffset = 0
  let cardDragging = false
  let cardDragStartX = 0
  let cardDragStartOffset = 0
  
  // 卡片位置配置 - 水平弧形分布（仿照Cosmos原版）
  const cardPositions = [
    { x: -550, y: 660, scale: 0.35, opacity: 0 },    // 左侧隐藏
    { x: -420, y: 640, scale: 0.5, opacity: 0.35 },  // 左侧远处
    { x: -260, y: 600, scale: 0.7, opacity: 0.6 },   // 左侧中间
    { x: -80, y: 560, scale: 0.9, opacity: 0.85 },   // 左侧近处
    { x: 100, y: 540, scale: 1.0, opacity: 1 },      // 中心（最大）
    { x: 280, y: 560, scale: 0.9, opacity: 0.85 },   // 右侧近处
    { x: 460, y: 600, scale: 0.7, opacity: 0.6 },    // 右侧中间
    { x: 620, y: 640, scale: 0.5, opacity: 0.35 },   // 右侧远处
    { x: 750, y: 660, scale: 0.35, opacity: 0 },     // 右侧隐藏
  ]
  
  // Get all card elements
  const cards = cardsContainer ? cardsContainer.querySelectorAll('.cluster-card') : []
  
  // Mouse handlers on the entire galaxy container
  galaxyContainer.addEventListener('mousedown', (e) => {
    isDragging = true
    dragStartX = e.clientX
    dragStartY = e.clientY
    dragRotationX = targetRotationX
    dragRotationY = targetRotationY
    cardDragStartX = e.clientX
    cardDragStartOffset = cardTargetOffset
    galaxyContainer.style.cursor = 'grabbing'
  })
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return
    const dx = (e.clientX - dragStartX) * 0.003
    const dy = (e.clientY - dragStartY) * 0.002
    targetRotationY = dragRotationY + dx
    targetRotationX = Math.max(-0.3, Math.min(0.3, dragRotationX - dy))
    
    // 同时移动卡片队列
    const cardDx = (e.clientX - cardDragStartX) * 0.015
    cardTargetOffset = cardDragStartOffset + cardDx
  })
  
  document.addEventListener('mouseup', () => {
    isDragging = false
    galaxyContainer.style.cursor = 'grab'
  })
  
  // Touch support
  galaxyContainer.addEventListener('touchstart', (e) => {
    isDragging = true
    dragStartX = e.touches[0].clientX
    dragStartY = e.touches[0].clientY
    dragRotationX = targetRotationX
    dragRotationY = targetRotationY
    cardDragStartX = e.touches[0].clientX
    cardDragStartOffset = cardTargetOffset
  }, { passive: true })
  
  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return
    const dx = (e.touches[0].clientX - dragStartX) * 0.003
    const dy = (e.touches[0].clientY - dragStartY) * 0.002
    targetRotationY = dragRotationY + dx
    targetRotationX = Math.max(-0.3, Math.min(0.3, dragRotationX - dy))
    
    // 同时移动卡片队列
    const cardDx = (e.touches[0].clientX - cardDragStartX) * 0.015
    cardTargetOffset = cardDragStartOffset + cardDx
  }, { passive: true })
  
  document.addEventListener('touchend', () => {
    isDragging = false
  })
  
  // 3D rotation function
  function rotatePoint(x, y, z, rotX, rotY) {
    // Rotate around Y axis (horizontal drag)
    let x1 = x * Math.cos(rotY) - z * Math.sin(rotY)
    let z1 = x * Math.sin(rotY) + z * Math.cos(rotY)
    
    // Rotate around X axis (vertical drag)
    let y1 = y * Math.cos(rotX) - z1 * Math.sin(rotX)
    let z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX)
    
    return { x: x1, y: y1, z: z2 }
  }
  
  // Project 3D to 2D with perspective
  function project(x, y, z, centerX, centerY) {
    const fov = 600
    const scale = fov / (fov + z + domeRadius)
    return {
      x: centerX + x * scale,
      y: centerY + y * scale,
      scale: scale
    }
  }
  
  // Auto rotation speed
  const autoRotateSpeed = 0.0003  // 自动缓慢旋转速度
  
  // Animation loop
  function animate() {
    // 自动缓慢旋转（当没有拖拽时）
    if (!isDragging) {
      targetRotationY += autoRotateSpeed
    }
    
    // Smooth interpolation
    rotationX += (targetRotationX - rotationX) * 0.06
    rotationY += (targetRotationY - rotationY) * 0.06
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    const centerX = canvas.width / 2
    const centerY = canvas.height * 0.6  // 穹顶在上方，视角中心略靠下
    const time = Date.now() * 0.001
    
    // Sort stars by Z for proper rendering (back to front)
    const sortedStars = stars.map((star, i) => {
      const rotated = rotatePoint(star.x, star.y, star.z, rotationX, rotationY)
      return { ...star, rotated, index: i }
    }).sort((a, b) => b.rotated.z - a.rotated.z)
    
    // Draw stars - 细小粒子，明灭闪烁
    sortedStars.forEach(star => {
      const { x, y, z } = star.rotated
      
      // Only draw stars in front of camera
      if (z < domeRadius * 0.8) {
        const projected = project(x, y, z, centerX, centerY)
        
        // 闪烁效果：2秒亮起 + 3秒熄灭
        const cycle = 5  // 5秒一个周期
        const blinkDuration = 2  // 亮起持续2秒
        const t = (time + star.twinkleOffset) % cycle
        let twinkle
        if (t < blinkDuration) {
          // 亮起期间：使用平滑的淡入淡出
          twinkle = Math.sin((t / blinkDuration) * Math.PI)
        } else {
          // 熄灭期间：完全不可见
          twinkle = 0
        }
        
        // 减少深度衰减的影响，让粒子更亮更清晰
        const depthFade = Math.max(0.5, 1 - (z + domeRadius) / (domeRadius * 3))
        const opacity = Math.min(1, star.brightness * twinkle * depthFade * 2.0)
        
        if (opacity > 0.02 && projected.x > -10 && projected.x < canvas.width + 10 && 
            projected.y > -10 && projected.y < canvas.height + 10) {
          const size = star.size * projected.scale
          
          // 绘制细小粒子 - 不使用光晕，只画一个小点
          ctx.beginPath()
          ctx.arc(projected.x, projected.y, Math.max(0.5, size), 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`
          ctx.fill()
        }
      }
    })
    
    // Update card positions - 水平弧形队列（无限循环）
    // 平滑插值卡片偏移
    cardOffset += (cardTargetOffset - cardOffset) * 0.08
    
    if (cards.length > 0) {
      const numPositions = cardPositions.length
      const numCards = cards.length
      const centerIndex = (numPositions - 1) / 2  // 中心位置索引
      const visibleRange = numPositions - 1  // 可见范围
      
      cards.forEach((card, i) => {
        // 计算卡片在位置数组中的索引（基于偏移，实现无限循环）
        const spacing = visibleRange / numCards  // 卡片之间的间距
        let basePos = i * spacing + cardOffset
        
        // 实现无限循环：将位置归一化到 [0, visibleRange] 范围
        basePos = ((basePos % visibleRange) + visibleRange) % visibleRange
        
        const t = basePos
        const lowIndex = Math.floor(t)
        const highIndex = (lowIndex + 1) % numPositions
        const fraction = t - lowIndex
        
        const pos1 = cardPositions[lowIndex]
        const pos2 = cardPositions[highIndex]
        
        // 线性插值
        const x = pos1.x + (pos2.x - pos1.x) * fraction
        const y = pos1.y + (pos2.y - pos1.y) * fraction
        const scale = pos1.scale + (pos2.scale - pos1.scale) * fraction
        const opacity = pos1.opacity + (pos2.opacity - pos1.opacity) * fraction
        
        // 计算z-index（靠近中心的最大）
        const distFromCenter = Math.abs(t - centerIndex)
        const zIndex = Math.floor(100 - distFromCenter * 15)
        
        // 应用变换
        card.style.position = 'absolute'
        card.style.left = `${canvas.width / 2 + x}px`
        card.style.top = `${y}px`
        card.style.transform = `translate(-50%, -50%) scale(${scale})`
        card.style.opacity = opacity
        card.style.zIndex = zIndex
      })
    }
    
    requestAnimationFrame(animate)
  }
  
  animate()
}

// ========================================
// Fake Mouse Cursor Animation
// ========================================
function initFakeCursor() {
  const cursor = document.getElementById('fakeCursor')
  if (!cursor) return
  
  const cursorDot = cursor.querySelector('.fake-cursor__dot')
  const cursorRing = cursor.querySelector('.fake-cursor__ring')
  
  let isActive = false
  let currentSection = null
  
  // Define cursor animation sequence for each section
  const cursorSequences = {
    'sectionExtensions': [
      { x: '70%', y: '40%', duration: 0.8, click: false },
      { x: '75%', y: '50%', duration: 0.5, click: true, delay: 0.3 },
      { x: '78%', y: '55%', duration: 0.4, click: false },
    ],
    'sectionGallery': [
      { x: '30%', y: '40%', duration: 0.6, click: false },
      { x: '40%', y: '50%', duration: 0.5, click: true, delay: 0.2 },
      { x: '55%', y: '45%', duration: 0.7, click: true, delay: 0.3 },
      { x: '70%', y: '55%', duration: 0.5, click: false },
    ],
    'sectionCurate': [
      { x: '65%', y: '35%', duration: 0.6, click: false },
      { x: '70%', y: '45%', duration: 0.4, click: true, delay: 0.2 },
      { x: '75%', y: '50%', duration: 0.5, click: false },
    ],
    'sectionExpression': [
      { x: '35%', y: '60%', duration: 0.8, click: false },
      { x: '45%', y: '65%', duration: 0.5, click: true, delay: 0.3 },
      { x: '55%', y: '60%', duration: 0.6, click: false },
      { x: '65%', y: '65%', duration: 0.4, click: true, delay: 0.2 },
    ]
  }
  
  function showCursor() {
    gsap.to(cursor, {
      opacity: 1,
      scale: 1,
      duration: 0.3,
      ease: 'expo.out'
    })
  }
  
  function hideCursor() {
    gsap.to(cursor, {
      opacity: 0,
      scale: 0.5,
      duration: 0.3,
      ease: 'expo.out'
    })
  }
  
  function clickEffect() {
    gsap.to(cursorRing, {
      scale: 1.5,
      opacity: 0,
      duration: 0.3,
      ease: 'expo.out',
      onComplete: () => {
        gsap.set(cursorRing, { scale: 1, opacity: 1 })
      }
    })
    gsap.to(cursorDot, {
      scale: 0.8,
      duration: 0.1,
      yoyo: true,
      repeat: 1
    })
  }
  
  function runSequence(sectionId) {
    const sequence = cursorSequences[sectionId]
    if (!sequence || isActive) return
    
    isActive = true
    currentSection = sectionId
    showCursor()
    
    const section = document.getElementById(sectionId)
    const rect = section.getBoundingClientRect()
    
    let tl = gsap.timeline({
      onComplete: () => {
        hideCursor()
        isActive = false
      }
    })
    
    sequence.forEach((step, index) => {
      const xPos = rect.left + rect.width * (parseFloat(step.x) / 100)
      const yPos = rect.top + rect.height * (parseFloat(step.y) / 100)
      
      tl.to(cursor, {
        left: xPos,
        top: yPos,
        duration: step.duration,
        ease: 'power2.inOut',
        delay: index === 0 ? 0 : 0.1
      })
      
      if (step.click) {
        tl.call(clickEffect, null, `+=${step.delay || 0}`)
      }
    })
  }
  
  // Trigger cursor animation for each section
  Object.keys(cursorSequences).forEach(sectionId => {
    ScrollTrigger.create({
      trigger: `#${sectionId}`,
      start: 'top 50%',
      onEnter: () => {
        if (!isActive) {
          runSequence(sectionId)
        }
      },
      once: true
    })
  })
}

// ========================================
// Scroll-Driven Image Follow Animation
// ========================================
function initScrollFollowImages() {
  const followImages = document.querySelectorAll('.follow-image')
  
  followImages.forEach((img, index) => {
    const startPos = {
      x: (index % 2 === 0 ? -200 : 200) + Math.random() * 100,
      y: 100 + Math.random() * 50,
      rotation: (index % 2 === 0 ? -15 : 15)
    }
    
    // Set initial position
    gsap.set(img, {
      x: startPos.x,
      y: startPos.y,
      rotation: startPos.rotation,
      opacity: 0
    })
    
    // Create scroll-driven animation
    const section = img.closest('section')
    
    ScrollTrigger.create({
      trigger: section,
      start: 'top 80%',
      end: 'center center',
      scrub: 1,
      onUpdate: (self) => {
        const progress = self.progress
        
        gsap.to(img, {
          x: startPos.x * (1 - progress),
          y: startPos.y * (1 - progress),
          rotation: startPos.rotation * (1 - progress),
          opacity: progress,
          duration: 0.1,
          ease: 'none'
        })
      }
    })
  })
}

// ========================================
// Section Parallax
// ========================================
function initSectionParallax() {
  // Parallax for cluster preview
  gsap.to('.cluster-preview', {
    y: -50,
    scrollTrigger: {
      trigger: '#sectionCurate',
      start: 'top bottom',
      end: 'bottom top',
      scrub: 1
    }
  })
  
  // Parallax for search preview
  gsap.to('.search-preview', {
    y: -30,
    scrollTrigger: {
      trigger: '#sectionSearch',
      start: 'top bottom',
      end: 'bottom top',
      scrub: 1
    }
  })
  
  // App preview parallax
  gsap.to('.app-preview', {
    y: -60,
    rotation: 5,
    scrollTrigger: {
      trigger: '#sectionDownload',
      start: 'top bottom',
      end: 'bottom top',
      scrub: 1
    }
  })
}

// ========================================
// Button Hover Effects
// ========================================
function initButtonEffects() {
  const buttons = document.querySelectorAll('.header__btn, .cta__btn, .download-btn')
  
  buttons.forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      gsap.to(btn, {
        scale: 1.02,
        duration: 0.3,
        ease: 'expo.out'
      })
    })
    
    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, {
        scale: 1,
        duration: 0.3,
        ease: 'expo.out'
      })
    })
  })
}

// ========================================
// Brands Animation
// ========================================
function initBrandsAnimation() {
  const logos = document.querySelectorAll('.brand-logo')
  
  gsap.from(logos, {
    opacity: 0,
    y: 30,
    scrollTrigger: {
      trigger: '#sectionBrands',
      start: 'top 70%',
      toggleActions: 'play none none none'
    },
    duration: 0.8,
    stagger: 0.1,
    ease: 'expo.out'
  })
}

// ========================================
// CTA Animation
// ========================================
function initCTAAnimation() {
  const cta = document.querySelector('.cta')
  
  gsap.from(cta.querySelector('.cta__eyebrow'), {
    opacity: 0,
    y: 20,
    scrollTrigger: {
      trigger: '#sectionCTA',
      start: 'top 70%',
      toggleActions: 'play none none none'
    },
    duration: 0.8,
    ease: 'expo.out'
  })
  
  gsap.from(cta.querySelector('.cta__btn'), {
    opacity: 0,
    y: 30,
    scale: 0.9,
    scrollTrigger: {
      trigger: '#sectionCTA',
      start: 'top 60%',
      toggleActions: 'play none none none'
    },
    duration: 0.8,
    delay: 0.3,
    ease: 'expo.out'
  })
}

// ========================================
// Cluster Cards Entrance Animation
// ========================================
function initClusterCarousel() {
  // Cards are now controlled by initStarfield() for 3D movement
  // This function only handles the initial entrance animation
  const carousel = document.getElementById('clustersCarousel')
  if (!carousel) return
  
  const cards = carousel.querySelectorAll('.cluster-card')
  
  // Set initial hidden state
  gsap.set(cards, { opacity: 0, scale: 0.8 })
  
  // Entrance animation when section comes into view
  ScrollTrigger.create({
    trigger: '#sectionExpression',
    start: 'top 60%',
    onEnter: () => {
      gsap.to(cards, {
        opacity: 1,
        scale: 1,
        duration: 1,
        stagger: 0.15,
        ease: 'expo.out'
      })
    },
    once: true
  })
}

// ========================================
// Page Animations (After Load)
// ========================================
function initPageAnimations() {
  // 标题颜色过渡在CSS中处理（loading -> loaded 类切换）
  // 不使用 gsap.from 避免闪烁
  
  // Initialize all other animations (图片会渐变淡入)
  initFloatingImages()
  initRotatingText()
  initSplitText()
  initAITags()
  initTypewriter()
  initGalleryAnimation()
  initClusterCarousel()
  initStarfield()
  initFakeCursor()
  initScrollFollowImages()
  initSectionParallax()
  initButtonEffects()
  initBrandsAnimation()
  initCTAAnimation()
  initOrderSectionAnimation()
}

// ========================================
// Order Section Text Animation (核心理念文字逐字入场动画 + 副标题轮播)
// ========================================
// 全局重置函数，供其他模块调用
let resetOrderSectionAnimation = () => {}

function initOrderSectionAnimation() {
  const section = document.getElementById('sectionOrder')
  if (!section) return
  
  const title = section.querySelector('.section__title')
  const subtitleContainer = document.getElementById('orderSubtitles')
  const subtitles = subtitleContainer ? subtitleContainer.querySelectorAll('.section__subtitle--rotating') : []
  
  if (!title) return
  
  // 将标题拆分为字符
  const titleText = title.textContent
  title.innerHTML = ''
  
  // 拆分成字符
  const chars = []
  titleText.split('').forEach(char => {
    const charSpan = document.createElement('span')
    charSpan.className = 'order-char'
    charSpan.textContent = char
    charSpan.style.display = 'inline-block'
    charSpan.style.transform = 'translateY(100%)'
    charSpan.style.opacity = '0'
    title.appendChild(charSpan)
    chars.push(charSpan)
  })
  
  // 副标题轮播状态
  let currentSubtitleIndex = 0
  let subtitleInterval = null
  
  // 副标题切换函数
  function rotateSubtitle() {
    if (subtitles.length === 0) return
    
    // 移除当前active
    subtitles[currentSubtitleIndex].classList.remove('active')
    
    // 切换到下一个
    currentSubtitleIndex = (currentSubtitleIndex + 1) % subtitles.length
    subtitles[currentSubtitleIndex].classList.add('active')
  }
  
  // 开始副标题轮播
  function startSubtitleRotation() {
    if (subtitleInterval) return
    subtitleInterval = setInterval(rotateSubtitle, 4000)  // 每4秒切换一次
  }
  
  // 停止副标题轮播
  function stopSubtitleRotation() {
    if (subtitleInterval) {
      clearInterval(subtitleInterval)
      subtitleInterval = null
    }
  }
  
  // 重置动画状态的函数
  function resetAnimation() {
    // 先杀死所有正在进行的动画
    gsap.killTweensOf(chars)
    if (subtitleContainer) {
      gsap.killTweensOf(subtitleContainer)
    }
    
    // 然后重置状态
    gsap.set(chars, { y: '100%', opacity: 0 })
    stopSubtitleRotation()
    if (subtitleContainer) {
      gsap.set(subtitleContainer, { opacity: 0 })
    }
    subtitles.forEach((sub, i) => {
      sub.classList.toggle('active', i === 0)
    })
    currentSubtitleIndex = 0
  }
  
  // 暴露重置函数到全局
  resetOrderSectionAnimation = resetAnimation
  
  // 播放入场动画的函数
  function playEnterAnimation() {
    gsap.to(chars, {
      y: 0,
      opacity: 1,
      duration: 0.6,
      stagger: 0.03,
      ease: 'expo.out'
    })
    
    if (subtitleContainer) {
      gsap.to(subtitleContainer, {
        opacity: 1,
        duration: 0.8,
        delay: 0.8
      })
      setTimeout(startSubtitleRotation, 1000)
    }
  }
  
  // 创建可重复触发的动画
  ScrollTrigger.create({
    trigger: section,
    start: 'top 80%',
    end: 'bottom 20%',
    onEnter: playEnterAnimation,
    onEnterBack: playEnterAnimation,
    onLeave: resetAnimation,
    onLeaveBack: resetAnimation
  })
}

// ========================================
// Global Search
// ========================================
function initSearch() {
  const searchBtn = document.getElementById('searchBtn')
  const projectSearchBtn = document.getElementById('projectSearchBtn')
  const projectAddBtn = document.getElementById('projectAddBtn')
  const searchModal = document.getElementById('searchModal')
  const searchBackdrop = document.getElementById('searchBackdrop')
  const searchInput = document.getElementById('searchInput')
  const searchResults = document.getElementById('searchResults')
  const searchEmpty = document.getElementById('searchEmpty')
  const searchHint = document.getElementById('searchHint')
  const searchLoading = document.getElementById('searchLoading')
  
  if (!searchModal) return
  
  let searchTimeout = null
  
  // 打开搜索
  const openSearch = () => {
    searchModal.classList.add('active')
    setTimeout(() => searchInput?.focus(), 100)
  }
  
  // 关闭搜索
  const closeSearch = () => {
    searchModal.classList.remove('active')
    if (searchInput) searchInput.value = ''
    if (searchResults) searchResults.innerHTML = ''
    searchResults?.classList.remove('active')
    searchEmpty?.classList.remove('active')
    searchHint?.style.setProperty('display', 'block')
  }
  
  // 搜索按钮点击（导航栏）
  searchBtn?.addEventListener('click', openSearch)
  
  // 项目管理界面的搜索按钮
  projectSearchBtn?.addEventListener('click', openSearch)
  
  // 项目管理界面的新建按钮
  projectAddBtn?.addEventListener('click', () => {
    window.location.href = `${CONFIG.DASHBOARD_URL}/projects/new`
  })
  
  // 背景点击关闭
  searchBackdrop?.addEventListener('click', closeSearch)
  
  // 键盘快捷键
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      openSearch()
    }
    if (e.key === 'Escape') {
      closeSearch()
    }
  })
  
  // 执行搜索
  const performSearch = async (query) => {
    if (!query.trim()) {
      searchResults?.classList.remove('active')
      searchEmpty?.classList.remove('active')
      searchHint?.style.setProperty('display', 'block')
      return
    }
    
    searchHint?.style.setProperty('display', 'none')
    searchLoading?.classList.add('active')
    
    try {
      // 获取 token
      const token = localStorage.getItem('access_token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      
      const results = []
      
      // 搜索项目
      try {
        const projectRes = await fetch(`${CONFIG.API_URL}/projects?search=${encodeURIComponent(query)}&limit=5`, { headers })
        if (projectRes.ok) {
          const projects = await projectRes.json()
          projects.forEach(p => {
            results.push({
              type: 'project',
              title: p.name,
              subtitle: p.business_type || p.industry || '',
              href: `${CONFIG.DASHBOARD_URL}/projects/${p.id}`
            })
          })
        }
      } catch (e) { console.log('Project search error:', e) }
      
      // 搜索用户
      try {
        const userRes = await fetch(`${CONFIG.API_URL}/users?search=${encodeURIComponent(query)}&limit=5`, { headers })
        if (userRes.ok) {
          const users = await userRes.json()
          users.forEach(u => {
            results.push({
              type: 'partner',
              title: u.name,
              subtitle: u.organization || u.email || '',
              href: `${CONFIG.DASHBOARD_URL}/partners/${u.id}`
            })
          })
        }
      } catch (e) { console.log('User search error:', e) }
      
      // 搜索资源
      try {
        const resourceRes = await fetch(`${CONFIG.API_URL}/resources?search=${encodeURIComponent(query)}&limit=5`, { headers })
        if (resourceRes.ok) {
          const data = await resourceRes.json()
          const resources = data.items || data
          resources.forEach(r => {
            results.push({
              type: 'resource',
              title: r.org_name,
              subtitle: r.description?.slice(0, 50) || '',
              href: `${CONFIG.DASHBOARD_URL}/resources`
            })
          })
        }
      } catch (e) { console.log('Resource search error:', e) }
      
      // 渲染结果
      searchLoading?.classList.remove('active')
      
      if (results.length > 0) {
        searchResults.innerHTML = results.map(r => `
          <a href="${r.href}" class="search-modal__result" data-nav-transition>
            <div class="search-modal__result-icon search-modal__result-icon--${r.type}">
              ${r.type === 'project' ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>' : ''}
              ${r.type === 'partner' ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>' : ''}
              ${r.type === 'resource' ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"></path><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path></svg>' : ''}
            </div>
            <div class="search-modal__result-content">
              <div class="search-modal__result-title">${r.title}</div>
              ${r.subtitle ? `<div class="search-modal__result-subtitle">${r.subtitle}</div>` : ''}
            </div>
            <span class="search-modal__result-badge">
              ${r.type === 'project' ? '项目' : r.type === 'partner' ? '合伙人' : '资源'}
            </span>
          </a>
        `).join('')
        
        searchResults?.classList.add('active')
        searchEmpty?.classList.remove('active')
        
        // 为搜索结果添加点击事件
        searchResults.querySelectorAll('.search-modal__result').forEach(link => {
          link.addEventListener('click', () => {
            closeSearch()
          })
        })
      } else {
        searchResults?.classList.remove('active')
        searchEmpty?.classList.add('active')
      }
    } catch (err) {
      console.error('Search error:', err)
      searchLoading?.classList.remove('active')
      searchEmpty?.classList.add('active')
    }
  }
  
  // 搜索输入（防抖）
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      performSearch(e.target.value)
    }, 300)
  })
}

// ========================================
// User Info & Notifications
// ========================================
// 使用全局配置中的 API_URL

function fetchUserInfoWithToken(token) {
  // 获取当前用户信息
  fetch(`${API_URL}/users/me`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(res => res.ok ? res.json() : null)
  .then(user => {
    if (user) {
      // 更新用户名
      const userNameEl = document.getElementById('userName')
      const userAvatarEl = document.getElementById('userAvatar')
      
      if (userNameEl) {
        userNameEl.textContent = user.name || '用户'
      }
      if (userAvatarEl) {
        userAvatarEl.textContent = (user.name || 'U').charAt(0)
      }
    }
  })
  .catch(err => console.error('Failed to fetch user info:', err))
  
  // 获取未读消息数量
  fetchNotificationCount(token)
}

function fetchNotificationCount(token) {
  if (!token) return
  
  fetch(`${API_URL}/notifications/inbox/stats`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(res => res.ok ? res.json() : null)
  .then(stats => {
    if (stats) {
      const badge = document.getElementById('notificationBadge')
      if (badge) {
        const count = stats.total_unread || 0
        if (count > 0) {
          badge.textContent = count > 99 ? '99+' : count
          badge.style.display = 'block'
        } else {
          badge.style.display = 'none'
        }
      }
    }
  })
  .catch(err => console.error('Failed to fetch notification stats:', err))
}

function initUserInfo() {
  // 总是从 Dashboard 获取最新的 token（确保与 Dashboard 登录状态同步）
  console.log(`Fetching token from ${CONFIG.DASHBOARD_URL}...`)
  
  // 创建隐藏的 iframe
  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  iframe.src = `${CONFIG.DASHBOARD_URL}/token-bridge.html`
  document.body.appendChild(iframe)
  
  // 监听来自 iframe 的消息
  const messageHandler = (event) => {
    if (event.origin !== CONFIG.DASHBOARD_URL) return
    if (event.data && event.data.type === 'TOKEN_BRIDGE') {
      const receivedToken = event.data.token
      if (receivedToken) {
        // 保存 token 到本地（更新为最新的）
        localStorage.setItem('access_token', receivedToken)
        fetchUserInfoWithToken(receivedToken)
      } else {
        console.log(`No token received from ${CONFIG.DASHBOARD_URL}, user may not be logged in`)
        // 清除本地可能过期的 token
        localStorage.removeItem('access_token')
      }
      // 清理
      window.removeEventListener('message', messageHandler)
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe)
      }
    }
  }
  
  window.addEventListener('message', messageHandler)
  
  // 5秒后超时清理
  setTimeout(() => {
    window.removeEventListener('message', messageHandler)
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe)
    }
  }, 5000)
}

// 定期刷新未读数量
function startNotificationPolling() {
  // 每30秒刷新一次
  setInterval(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    fetchNotificationCount(token)
  }, 30000)
}

// ========================================
// Feature Cards - 功能模块卡片翻转效果
// ========================================
function initFeatureCards() {
  const featureCards = document.querySelectorAll('.feature-card')
  
  featureCards.forEach(card => {
    const inner = card.querySelector('.feature-card__inner')
    if (!inner) return
    
    // Hover 翻转效果
    card.addEventListener('mouseenter', () => {
      gsap.to(inner, {
        rotateY: 180,
        duration: 0.6,
        ease: 'power2.out'
      })
    })
    
    card.addEventListener('mouseleave', () => {
      gsap.to(inner, {
        rotateY: 0,
        duration: 0.6,
        ease: 'power2.out'
      })
    })
    
    // 点击跳转
    card.addEventListener('click', () => {
      const href = card.dataset.href
      if (href) {
        // 添加点击反馈动画
        gsap.to(inner, {
          scale: 0.95,
          duration: 0.1,
          ease: 'power2.out',
          onComplete: () => {
            gsap.to(inner, {
              scale: 1,
              duration: 0.2,
              ease: 'back.out(1.7)'
            })
            // 延迟跳转
            setTimeout(() => {
              window.location.href = href
            }, 150)
          }
        })
      }
    })
  })
}

// ========================================
// Particle Cube - 粒子立方体装饰
// ========================================
function initParticleCube() {
  const canvas = document.getElementById('particleCube')
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  const container = canvas.parentElement
  
  // 设置canvas尺寸
  function resizeCanvas() {
    canvas.width = container.offsetWidth * 2
    canvas.height = container.offsetHeight * 2
    ctx.scale(2, 2)
  }
  resizeCanvas()
  
  const centerX = container.offsetWidth / 2
  const centerY = container.offsetHeight / 2
  const cubeSize = 50  // 标准立方体边长
  
  // 鼠标位置
  let mouseX = -1000
  let mouseY = -1000
  const mouseRadius = 80
  
  // 立方体顶点 (8个)
  const vertices = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
  ]
  
  // 立方体边 (12条)
  const edges = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7]
  ]
  
  // 粒子类
  class Particle {
    constructor(x, y, z, edgeIndex, t) {
      this.baseX = x
      this.baseY = y
      this.baseZ = z
      this.x = x
      this.y = y
      this.z = z
      this.edgeIndex = edgeIndex
      this.t = t
      this.vx = 0
      this.vy = 0
      this.vz = 0
      this.size = 1.5 + Math.random() * 1
      this.alpha = 0.3 + Math.random() * 0.4
    }
    
    update(rotX, rotY, mouseX2D, mouseY2D) {
      // 计算基础位置（旋转后）
      let bx = this.baseX
      let by = this.baseY
      let bz = this.baseZ
      
      // 绕Y轴旋转
      let cosY = Math.cos(rotY)
      let sinY = Math.sin(rotY)
      let x1 = bx * cosY - bz * sinY
      let z1 = bx * sinY + bz * cosY
      
      // 绕X轴旋转
      let cosX = Math.cos(rotX)
      let sinX = Math.sin(rotX)
      let y1 = by * cosX - z1 * sinX
      let z2 = by * sinX + z1 * cosX
      
      // 投影到2D
      const scale = 150 / (150 + z2)
      const targetX = centerX + x1 * scale
      const targetY = centerY + y1 * scale
      
      // 鼠标排斥力
      const dx = targetX - mouseX2D
      const dy = targetY - mouseY2D
      const dist = Math.sqrt(dx * dx + dy * dy)
      
      if (dist < mouseRadius && dist > 0) {
        const force = (mouseRadius - dist) / mouseRadius
        const angle = Math.atan2(dy, dx)
        this.vx += Math.cos(angle) * force * 3
        this.vy += Math.sin(angle) * force * 3
      }
      
      // 回弹到目标位置
      this.vx += (targetX - this.x) * 0.08
      this.vy += (targetY - this.y) * 0.08
      
      // 阻尼
      this.vx *= 0.9
      this.vy *= 0.9
      
      this.x += this.vx
      this.y += this.vy
      
      // 深度影响透明度
      this.currentAlpha = this.alpha * (0.5 + (z2 + cubeSize) / (cubeSize * 2) * 0.5)
    }
    
    draw(ctx) {
      ctx.beginPath()
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 255, 255, ${this.currentAlpha})`
      ctx.fill()
    }
  }
  
  // 在每条边上生成粒子
  const particles = []
  const particlesPerEdge = 15  // 更多粒子使边缘更清晰
  
  edges.forEach((edge, edgeIndex) => {
    const [v1, v2] = edge
    for (let i = 0; i <= particlesPerEdge; i++) {
      const t = i / particlesPerEdge
      const x = (vertices[v1][0] + (vertices[v2][0] - vertices[v1][0]) * t) * cubeSize
      const y = (vertices[v1][1] + (vertices[v2][1] - vertices[v1][1]) * t) * cubeSize
      const z = (vertices[v1][2] + (vertices[v2][2] - vertices[v1][2]) * t) * cubeSize
      const p = new Particle(x, y, z, edgeIndex, t)
      p.size = 2  // 粒子大小
      p.alpha = 0.8  // 更亮
      particles.push(p)
    }
  })
  
  // 在顶点位置添加亮点粒子
  vertices.forEach(v => {
    const x = v[0] * cubeSize
    const y = v[1] * cubeSize
    const z = v[2] * cubeSize
    const p = new Particle(x, y, z, -1, 0)
    p.size = 3.5  // 顶点粒子更大更亮
    p.alpha = 1
    particles.push(p)
  })
  
  let rotationY = 0
  let rotationX = -0.5  // 稍微倾斜以显示立方体的三个面
  
  // 鼠标事件
  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect()
    mouseX = e.clientX - rect.left
    mouseY = e.clientY - rect.top
  })
  
  container.addEventListener('mouseleave', () => {
    mouseX = -1000
    mouseY = -1000
  })
  
  // 动画循环
  function animate() {
    ctx.clearRect(0, 0, container.offsetWidth, container.offsetHeight)
    
    rotationY += 0.008
    
    particles.forEach(p => {
      p.update(rotationX, rotationY, mouseX, mouseY)
      p.draw(ctx)
    })
    
    // 绘制连线 - 增强边缘可见性
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
    ctx.lineWidth = 1
    edges.forEach(edge => {
      const [v1, v2] = edge
      
      // 计算顶点位置
      let x1 = vertices[v1][0] * cubeSize
      let y1 = vertices[v1][1] * cubeSize
      let z1 = vertices[v1][2] * cubeSize
      
      let x2 = vertices[v2][0] * cubeSize
      let y2 = vertices[v2][1] * cubeSize
      let z2 = vertices[v2][2] * cubeSize
      
      // 旋转
      let cosY = Math.cos(rotationY)
      let sinY = Math.sin(rotationY)
      let cosX = Math.cos(rotationX)
      let sinX = Math.sin(rotationX)
      
      // 顶点1
      let tx1 = x1 * cosY - z1 * sinY
      let tz1 = x1 * sinY + z1 * cosY
      let ty1 = y1 * cosX - tz1 * sinX
      let fz1 = y1 * sinX + tz1 * cosX
      
      // 顶点2
      let tx2 = x2 * cosY - z2 * sinY
      let tz2 = x2 * sinY + z2 * cosY
      let ty2 = y2 * cosX - tz2 * sinX
      let fz2 = y2 * sinX + tz2 * cosX
      
      // 投影
      let s1 = 150 / (150 + fz1)
      let s2 = 150 / (150 + fz2)
      
      let px1 = centerX + tx1 * s1
      let py1 = centerY + ty1 * s1
      let px2 = centerX + tx2 * s2
      let py2 = centerY + ty2 * s2
      
      ctx.beginPath()
      ctx.moveTo(px1, py1)
      ctx.lineTo(px2, py2)
      ctx.stroke()
    })
    
    requestAnimationFrame(animate)
  }
  
  animate()
  
  // 窗口大小改变时重置
  window.addEventListener('resize', resizeCanvas)
}

// ========================================
// Particle Logo - 粒子Logo效果
// ========================================
function initParticleLogo() {
  const canvas = document.getElementById('particleLogo')
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  const container = canvas.parentElement
  
  // 设置canvas尺寸
  let width, height
  function resizeCanvas() {
    width = container.offsetWidth
    height = container.offsetHeight
    canvas.width = width * 2
    canvas.height = height * 2
    ctx.scale(2, 2)
  }
  resizeCanvas()
  
  // 鼠标位置
  let mouseX = -1000
  let mouseY = -1000
  const mouseRadius = 60
  
  // 粒子数组
  let particles = []
  
  // 入场动画状态
  let entranceComplete = false
  let entranceStartTime = 0
  const entranceDuration = 3500 // 入场动画持续时间（毫秒）
  
  // 粒子类
  class Particle {
    constructor(x, y, size = 0.6, index = 0, totalParticles = 1) {
      this.baseX = x
      this.baseY = y
      
      // 入场动画：从画布内随机位置开始（完全随机散布，无边界感）
      // 使用极坐标 + 随机偏移，让粒子从中心向外完全随机分布
      const centerX = width / 2
      const centerY = height / 2
      
      // 随机方向和距离（在整个画布范围内随机分布）
      const angle = Math.random() * Math.PI * 2
      const maxRadius = Math.max(width, height) * 0.6 // 最大半径为画布对角线的一半
      const radius = Math.random() * maxRadius
      
      // 添加额外的随机偏移，打破规则性
      const offsetX = (Math.random() - 0.5) * width * 0.8
      const offsetY = (Math.random() - 0.5) * height * 0.8
      
      this.x = centerX + Math.cos(angle) * radius + offsetX
      this.y = centerY + Math.sin(angle) * radius + offsetY
      
      // 确保在画布范围内（带一点边距）
      this.x = Math.max(10, Math.min(width - 10, this.x))
      this.y = Math.max(10, Math.min(height - 10, this.y))
      
      // 保存初始位置用于动画
      this.startX = this.x
      this.startY = this.y
      
      this.vx = 0
      this.vy = 0
      this.size = size + Math.random() * 0.1  // 非常小的粒子，更清晰
      this.alpha = 0 // 初始透明
      this.targetAlpha = 0.95 + Math.random() * 0.05
      
      // 每个粒子有不同的延迟，创造波浪效果
      this.delay = Math.random() * 600 // 随机延迟0-0.6秒
      this.animationDuration = 1500 + Math.random() * 1000 // 每个粒子动画持续1.5-2.5秒
    }
    
    update(currentTime) {
      // 如果入场动画还没触发，保持初始状态（不可见）
      if (!entranceTriggered) {
        this.alpha = 0
        return
      }
      
      const elapsed = currentTime - entranceStartTime
      
      if (!entranceComplete) {
        // 入场动画阶段
        if (elapsed > this.delay) {
          // 计算动画进度 (0 到 1)
          const animProgress = Math.min(1, (elapsed - this.delay) / this.animationDuration)
          
          // 使用缓动函数使运动更自然 (easeOutExpo - 先快后慢)
          const easeProgress = animProgress === 1 ? 1 : 1 - Math.pow(2, -10 * animProgress)
          
          // 从起点到终点的插值
          this.x = this.startX + (this.baseX - this.startX) * easeProgress
          this.y = this.startY + (this.baseY - this.startY) * easeProgress
          
          // 渐显效果 - 在动画前半段完成
          this.alpha = this.targetAlpha * Math.min(1, animProgress * 2)
        }
      } else {
        // 入场完成后的正常交互
        // 鼠标排斥力
        const dx = this.x - mouseX
        const dy = this.y - mouseY
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist < mouseRadius && dist > 0) {
          const force = (mouseRadius - dist) / mouseRadius
          const angle = Math.atan2(dy, dx)
          this.vx += Math.cos(angle) * force * 4
          this.vy += Math.sin(angle) * force * 4
        }
        
        // 回弹到目标位置
        this.vx += (this.baseX - this.x) * 0.05
        this.vy += (this.baseY - this.y) * 0.05
        
        // 阻尼
        this.vx *= 0.92
        this.vy *= 0.92
        
        this.x += this.vx
        this.y += this.vy
        
        // 确保透明度完整
        this.alpha = this.targetAlpha
      }
    }
    
    draw(ctx) {
      ctx.beginPath()
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`
      ctx.fill()
    }
  }
  
  // 从图像采样粒子位置
  function sampleParticlesFromImage(img) {
    // 创建临时canvas来读取图像像素
    const tempCanvas = document.createElement('canvas')
    const tempCtx = tempCanvas.getContext('2d')
    
    // 计算合适的尺寸 - 增大显示区域
    const maxSize = Math.min(width, height) * 1.1
    const scale = maxSize / Math.max(img.width, img.height)
    const imgWidth = img.width * scale
    const imgHeight = img.height * scale
    
    tempCanvas.width = imgWidth
    tempCanvas.height = imgHeight
    
    // 绘制图像
    tempCtx.drawImage(img, 0, 0, imgWidth, imgHeight)
    
    // 获取像素数据
    const imageData = tempCtx.getImageData(0, 0, imgWidth, imgHeight)
    const data = imageData.data
    
    // 计算偏移量使图像居中
    const offsetX = (width - imgWidth) / 2
    const offsetY = (height - imgHeight) / 2
    
    // 采样间隔 - 更小间隔获取更多细节
    const gap = 3
    
    particles = []
    
    for (let y = 0; y < imgHeight; y += gap) {
      for (let x = 0; x < imgWidth; x += gap) {
        const i = (Math.floor(y) * Math.floor(imgWidth) + Math.floor(x)) * 4
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const a = data[i + 3]
        
        // 检测深色像素（logo是深蓝色）
        const brightness = (r + g + b) / 3
        
        // 只检测深色内容（logo主体，brightness < 100），排除圆形边框
        const isDarkContent = brightness < 100 && a > 50
        
        if (isDarkContent) {
          const px = offsetX + x
          const py = offsetY + y
          // 更小的粒子，更清晰
          const particleSize = 0.5 + (1 - brightness / 100) * 0.3
          particles.push({ px, py, particleSize })
        }
      }
    }
    
    // 计算总粒子数后再创建粒子对象（用于入场延迟计算）
    const totalParticles = particles.length
    particles = particles.map((p, index) => new Particle(p.px, p.py, p.particleSize, index, totalParticles))
    
    console.log('Particle Logo: created', particles.length, 'particles (waiting for scroll trigger)')
  }
  
  // 入场动画是否已触发（只触发一次）
  let entranceTriggered = false
  
  // 触发入场动画
  function triggerEntranceAnimation() {
    if (entranceTriggered) return
    entranceTriggered = true
    entranceComplete = false
    entranceStartTime = performance.now()
    console.log('Particle Logo: entrance animation triggered!')
  }
  
  // 加载Logo图像
  const logoImg = new Image()
  logoImg.crossOrigin = 'anonymous'
  logoImg.onload = () => {
    sampleParticlesFromImage(logoImg)
    animate()
    
    // 使用 IntersectionObserver 检测用户滚动到该区域
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entranceTriggered) {
          triggerEntranceAnimation()
        }
      })
    }, {
      threshold: 0.2 // 当 20% 的区域可见时触发
    })
    
    observer.observe(container)
  }
  logoImg.onerror = () => {
    console.error('Failed to load logo image')
  }
  logoImg.src = '/logo-full.png'
  
  // 鼠标事件
  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect()
    mouseX = e.clientX - rect.left
    mouseY = e.clientY - rect.top
  })
  
  container.addEventListener('mouseleave', () => {
    mouseX = -1000
    mouseY = -1000
  })
  
  // 动画循环
  function animate() {
    ctx.clearRect(0, 0, width, height)
    
    const currentTime = performance.now()
    
    // 检测入场动画是否完成
    if (!entranceComplete && currentTime - entranceStartTime > entranceDuration + 500) {
      entranceComplete = true
      console.log('Particle Logo: entrance animation complete')
    }
    
    particles.forEach(p => {
      p.update(currentTime)
      p.draw(ctx)
    })
    
    requestAnimationFrame(animate)
  }
  
  // 窗口大小改变时重新采样
  window.addEventListener('resize', () => {
    resizeCanvas()
    if (logoImg.complete && logoImg.naturalWidth > 0) {
      sampleParticlesFromImage(logoImg)
    }
  })
}

// ========================================
// Initialize Everything
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  initDynamicLinks()    // 动态替换硬编码链接（必须最先执行）
  initLoader()
  initCookieNotice()
  initNavigation()      // 导航转场效果
  initDropdownMenu()    // 更多下拉菜单
  initScrollHint()
  initHeader()
  initSearch()          // 全局搜索
  initUserInfo()        // 用户信息和通知
  startNotificationPolling()  // 定期刷新通知
  initFeatureCards()    // 功能模块卡片翻转效果
  initParticleCube()    // 粒子立方体装饰
  initParticleLogo()    // 粒子Logo效果
})

// Refresh ScrollTrigger on resize
window.addEventListener('resize', () => {
  ScrollTrigger.refresh()
})

