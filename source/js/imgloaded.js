class ProgressiveLoad {
  constructor(smallSrc, largeSrc) {
    this.smallSrc = smallSrc;
    this.largeSrc = largeSrc;
    this.lastScrollY = window.scrollY;
    this.scrollTimeout = null;

    this.initTpl();
    this.addScrollArrow();
    this.initScrollListener();
  }

  initTpl() {
    this.container = document.createElement('div');
    this.smallStage = document.createElement('div');
    this.largeStage = document.createElement('div');
    this.video = document.createElement('div');

    this.smallImg = new Image();
    this.largeImg = new Image();

    this.container.className = 'pl-container';
    this.container.style.setProperty("--process", 0);

    this.smallStage.className = 'pl-img pl-blur';
    this.largeStage.className = 'pl-img';
    this.video.className = 'pl-video';

    this.container.appendChild(this.smallStage);
    this.container.appendChild(this.largeStage);
    this.container.appendChild(this.video);

    this.smallImg.onload = this._onSmallLoaded.bind(this);
    this.largeImg.onload = this._onLargeLoaded.bind(this);
  }

  addScrollArrow() {
    this.arrow = document.createElement('div');
    this.arrow.className = 'scroll-down-arrow';
    this.arrow.style.animation = 'float 1.5s ease-in-out infinite';
    this.arrow.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    this.arrow.addEventListener('click', () => {
      window.scrollTo({
        top: window.innerHeight,
        behavior: 'smooth'
      });
    });
    this.container.appendChild(this.arrow);
  }

  initScrollListener() {
    let lastScrollPosition = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      const currentScroll = window.scrollY;
      const scrollDirection = currentScroll > lastScrollPosition ? 'down' : 'up';
      lastScrollPosition = currentScroll;
      
      const progress = Math.min(currentScroll / window.innerHeight, 1);
      this.container.style.setProperty("--process", progress);

      // 箭头行为控制
      if (this.arrow) {
        if (scrollDirection === 'down') {
          // 向下滚动 - 根据滚动进度淡出
          this.arrow.style.opacity = `${1 - progress}`;
        } else {
          // 向上滚动 - 立即隐藏
          this.arrow.style.opacity = '0';
        }

        // 回到顶部时重新显示
        if (currentScroll <= 10) {
          this.arrow.style.opacity = '1';
        }
      }
    };

    // 优化滚动性能
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    });

    // 初始状态检查
    handleScroll();
  }

  progressiveLoad() {
    this.smallImg.src = this.smallSrc;
    this.largeImg.src = this.largeSrc;
  }

  _onSmallLoaded() {
    this.smallStage.classList.add('pl-visible');
    this.smallStage.style.backgroundImage = `url('${this.smallSrc}')`;
  }

  _onLargeLoaded() {
    this.largeStage.classList.add('pl-visible');
    this.largeStage.style.backgroundImage = `url('${this.largeSrc}')`;
  }
}

// 执行加载
const executeLoad = (config, target) => {
  const isMobile = window.matchMedia('(max-width: 767px)').matches;
  const loader = new ProgressiveLoad(
    isMobile ? config.mobileSmallSrc : config.smallSrc,
    isMobile ? config.mobileLargeSrc : config.largeSrc
  );
  target.appendChild(loader.container);
  loader.progressiveLoad();
};

// 配置
const config = {
  smallSrc: '/img/tu.jpg',
  largeSrc: '/img/tu.jpg',
  mobileSmallSrc: '/img/sjdt.jpg',
  mobileLargeSrc: '/img/sjdt.jpg',
  enableRoutes: ['/'],
};

// 初始化
function initProgressiveLoad(config) {
  const container = document.querySelector('.pl-container');
  if (container) container.remove();

  const target = document.getElementById('page-header');
  if (target && target.classList.contains('not-top-img')) {
    executeLoad(config, target);
  }
}

// PJAX兼容
function onPJAXComplete(config) {
  const target = document.getElementById('page-header');
  if (target && target.classList.contains('not-top-img')) {
    initProgressiveLoad(config);
  }
}

// 事件监听
document.addEventListener("DOMContentLoaded", () => initProgressiveLoad(config));
document.addEventListener("pjax:complete", () => onPJAXComplete(config));





