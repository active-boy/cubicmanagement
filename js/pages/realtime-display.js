// 实时车位显示页面逻辑
(function() {
    'use strict';

    let currentFilter = {
        garage: 'all',
        level: 'all'
    };

    // 初始化
    document.addEventListener('DOMContentLoaded', async () => {
        await initGarageFilter();
        await loadAndDisplay();
        // 每30秒自动刷新
        setInterval(refreshDisplay, 30000);
    });

    // 初始化车库筛选器
    async function initGarageFilter() {
        const filterGarage = document.getElementById('filterGarage');
        if (filterGarage && window.ParkingDataAPI) {
            const garages = await window.ParkingDataAPI.getGarages();
            garages.forEach(garage => {
                const option = document.createElement('option');
                option.value = garage;
                option.textContent = `${garage}区`;
                filterGarage.appendChild(option);
            });
        }
    }

    // 加载并显示车位信息
    async function loadAndDisplay() {
        const displayDiv = document.getElementById('garageDisplay');
        if (!displayDiv) return;

        displayDiv.innerHTML = '<div class="loading">加载中...</div>';

        try {
            const reservations = await window.ReservationAPI.getActiveReservations();
            const parkingData = await window.ParkingDataAPI.getParkingData();
            const garages = await window.ParkingDataAPI.getGarages();
            
            // 更新统计数据
            await updateStatistics(reservations, parkingData);
            
            // 显示车库
            displayGarages(garages, reservations, parkingData);
        } catch (error) {
            console.error('加载车位数据失败:', error);
            displayDiv.innerHTML = '<div class="loading">加载失败，请刷新重试</div>';
        }
    }

    // 更新统计数据
    async function updateStatistics(reservations, parkingData) {
        const stats = await window.ParkingDataAPI.getStatistics();
        const activeReservations = reservations.filter(r => new Date(r.endTime) > new Date()).length;
        
        document.getElementById('totalSpots').textContent = stats.totalSpots;
        document.getElementById('bookedSpots').textContent = activeReservations;
        document.getElementById('availableSpots').textContent = stats.availableSpots;
        document.getElementById('occupancyRate').textContent = `${stats.occupancyRate}%`;
    }

    // 显示所有车库
    function displayGarages(garages, reservations, parkingData) {
        const displayDiv = document.getElementById('garageDisplay');
        if (!displayDiv) return;

        let filteredGarages = garages;
        if (currentFilter.garage !== 'all') {
            filteredGarages = [currentFilter.garage];
        }

        const html = filteredGarages.map(garage => {
            return `
                <div class="garage-card">
                    <div class="garage-header">
                        <span>${garage}区</span>
                        <span class="garage-stats" id="garageStats_${garage}">加载中...</span>
                    </div>
                    <div class="level-container">
                        ${displayLevel(garage, 1, reservations, parkingData)}
                        ${displayLevel(garage, 2, reservations, parkingData)}
                    </div>
                </div>
            `;
        }).join('');

        displayDiv.innerHTML = html;
        
        // 更新每个车库存统计
        filteredGarages.forEach(garage => {
            updateGarageStats(garage, reservations);
        });
    }

    // 显示单层车位
    function displayLevel(garage, level, reservations, parkingData) {
        if (currentFilter.level !== 'all' && currentFilter.level != level) {
            return '';
        }

        const spots = [];
        for (let i = 1; i <= 26; i++) {
            const isOccupied = isSpotOccupied(garage, level, i, reservations);
            const reservation = getReservationForSpot(garage, level, i, reservations);
            spots.push(`
                <div class="spot-card ${isOccupied ? 'occupied' : 'available'}" 
                     onclick="showSpotDetail('${garage}', ${level}, ${i}, ${isOccupied})">
                    <div class="spot-number">${i}号</div>
                    <div class="spot-status ${isOccupied ? 'status-occupied' : 'status-available'}">
                        ${isOccupied ? '已预约' : '空闲'}
                    </div>
                    ${isOccupied && reservation ? `<div class="spot-phone">车主: ${maskPhone(reservation.phoneNumber)}</div>` : ''}
                    <div class="spot-tooltip">
                        ${isOccupied ? '不可预约' : '可预约'}
                    </div>
                </div>
            `);
        }

        return `
            <div class="level-title">${level}层</div>
            <div class="spots-grid">
                ${spots.join('')}
            </div>
        `;
    }

    // 检查车位是否被占用
    function isSpotOccupied(garage, level, spotNumber, reservations) {
        const now = new Date();
        return reservations.some(r => 
            r.garage === garage && 
            r.level === level && 
            r.spotNumber === spotNumber &&
            new Date(r.endTime) > now &&
            r.status !== 'cancelled'
        );
    }

    // 获取车位的预约信息
    function getReservationForSpot(garage, level, spotNumber, reservations) {
        const now = new Date();
        return reservations.find(r => 
            r.garage === garage && 
            r.level === level && 
            r.spotNumber === spotNumber &&
            new Date(r.endTime) > now &&
            r.status !== 'cancelled'
        );
    }

    // 更新车库存统计
    function updateGarageStats(garage, reservations) {
        const now = new Date();
        const garageReservations = reservations.filter(r => 
            r.garage === garage && 
            new Date(r.endTime) > now &&
            r.status !== 'cancelled'
        );
        
        const occupiedCount = garageReservations.length;
        const totalSpots = 52; // 26个车位 * 2层
        const statsSpan = document.getElementById(`garageStats_${garage}`);
        if (statsSpan) {
            statsSpan.textContent = `已预约: ${occupiedCount}/${totalSpots}`;
        }
    }

    // 显示车位详情
    window.showSpotDetail = function(garage, level, spotNumber, isOccupied) {
        if (isOccupied) {
            showMessage(`车位 ${garage}区${level}层${spotNumber}号 已被预约`, 'info');
        } else {
            // 跳转到预约页面并预填信息
            window.setTempData('quickReservation', { garage, level, spotNumber });
            window.navigateTo('reservation.html');
        }
    };

    // 刷新显示
    window.refreshDisplay = async function() {
        const refreshBtn = document.querySelector('.refresh-btn');
        if (refreshBtn) {
            const originalText = refreshBtn.textContent;
            refreshBtn.textContent = '刷新中...';
            refreshBtn.disabled = true;
            
            await loadAndDisplay();
            
            refreshBtn.textContent = originalText;
            refreshBtn.disabled = false;
            showMessage('数据已刷新', 'success');
        } else {
            await loadAndDisplay();
        }
    };

    // 筛选显示
    window.filterDisplay = function() {
        const filterGarage = document.getElementById('filterGarage');
        const filterLevel = document.getElementById('filterLevel');
        
        currentFilter.garage = filterGarage ? filterGarage.value : 'all';
        currentFilter.level = filterLevel ? filterLevel.value : 'all';
        
        loadAndDisplay();
    };

    // 隐藏手机号中间4位
    function maskPhone(phone) {
        if (!phone || phone.length !== 11) return phone;
        return phone.substring(0, 3) + '****' + phone.substring(7);
    }
})();