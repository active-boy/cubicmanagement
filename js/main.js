// 全局路由和初始化逻辑
(function() {
    'use strict';

    // 页面路由配置
    const routes = {
        '/': 'index.html',
        '/index.html': 'index.html',
        '/pages/reservation.html': 'pages/reservation.html',
        '/pages/realtime-display.html': 'pages/realtime-display.html',
        '/pages/alarm.html': 'pages/alarm.html',
        '/pages/pickup.html': 'pages/pickup.html',
        '/pages/payment.html': 'pages/payment.html'
    };

    // 检查是否需要登录/验证（某些页面需要）
    const protectedPages = ['pages/payment.html'];

    // 初始化全局变量
    window.app = window.app || {};
    window.app.currentUser = null;
    window.app.currentReservation = null;

    // 页面加载完成后的初始化
    document.addEventListener('DOMContentLoaded', function() {
        initNavigation();
        initGlobalEventListeners();
        loadGlobalData();
    });

    // 初始化导航
    function initNavigation() {
        // 为所有带有data-nav的链接添加导航功能
        document.querySelectorAll('[data-nav]').forEach(el => {
            el.addEventListener('click', function(e) {
                e.preventDefault();
                const target = this.getAttribute('data-nav');
                if (target) {
                    navigateTo(target);
                }
            });
        });
    }

    // 全局事件监听
    function initGlobalEventListeners() {
        // 监听页面可见性变化，刷新数据
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) {
                refreshCurrentPageData();
            }
        });

        // 监听网络状态
        window.addEventListener('online', function() {
            showMessage('网络已连接', 'success');
            refreshCurrentPageData();
        });

        window.addEventListener('offline', function() {
            showMessage('网络已断开，部分功能可能不可用', 'error');
        });
    }

    // 加载全局数据
    async function loadGlobalData() {
        try {
            // 预加载停车场数据
            if (window.ParkingDataAPI) {
                await window.ParkingDataAPI.getParkingData();
            }
            
            // 预加载预约数据
            if (window.ReservationAPI) {
                await window.ReservationAPI.getReservations();
            }
        } catch (error) {
            console.error('加载全局数据失败:', error);
        }
    }

    // 刷新当前页面数据
    function refreshCurrentPageData() {
        const currentPage = window.location.pathname;
        
        if (currentPage.includes('realtime-display')) {
            if (window.refreshDisplay) {
                window.refreshDisplay();
            }
        } else if (currentPage.includes('index')) {
            if (window.updateHomeStats) {
                window.updateHomeStats();
            }
        }
    }

    // 获取URL参数
    function getUrlParams() {
        const params = {};
        const queryString = window.location.search.substring(1);
        const pairs = queryString.split('&');
        
        for (let pair of pairs) {
            if (pair) {
                const [key, value] = pair.split('=');
                params[decodeURIComponent(key)] = decodeURIComponent(value || '');
            }
        }
        return params;
    }

    // 设置URL参数（不刷新页面）
    function setUrlParams(params) {
        const url = new URL(window.location.href);
        for (let [key, value] of Object.entries(params)) {
            if (value) {
                url.searchParams.set(key, value);
            } else {
                url.searchParams.delete(key);
            }
        }
        window.history.pushState({}, '', url);
    }

    // 清除URL参数
    function clearUrlParams() {
        const url = new URL(window.location.href);
        url.search = '';
        window.history.pushState({}, '', url);
    }

    // 存储临时数据（用于页面间传递）
    function setTempData(key, data) {
        sessionStorage.setItem(`temp_${key}`, JSON.stringify(data));
    }

    function getTempData(key) {
        const data = sessionStorage.getItem(`temp_${key}`);
        return data ? JSON.parse(data) : null;
    }

    function clearTempData(key) {
        sessionStorage.removeItem(`temp_${key}`);
    }

    // 导出全局函数
    window.navigateTo = navigateTo;
    window.showMessage = showMessage;
    window.getUrlParams = getUrlParams;
    window.setUrlParams = setUrlParams;
    window.clearUrlParams = clearUrlParams;
    window.setTempData = setTempData;
    window.getTempData = getTempData;
    window.clearTempData = clearTempData;

    // 防抖函数
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 节流函数
    function throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    window.debounce = debounce;
    window.throttle = throttle;
})();