// 停车场数据接口
(function() {
    'use strict';

    // 停车场数据结构
    const PARKING_STRUCTURE = {
        garages: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
        levels: [1, 2],
        spotsPerLevel: 26,
        hourlyRate: 5
    };

    // 初始化停车场数据
    let parkingData = null;

    class ParkingDataAPI {
        // 获取停车场数据
        async getParkingData() {
            if (parkingData) {
                return parkingData;
            }

            try {
                // 尝试从localStorage加载
                const saved = localStorage.getItem('parking_structure');
                if (saved) {
                    parkingData = JSON.parse(saved);
                    return parkingData;
                }
            } catch (e) {
                console.warn('加载停车场数据失败:', e);
            }

            // 初始化默认数据
            parkingData = this.initParkingData();
            await this.saveParkingData();
            return parkingData;
        }

        // 初始化停车场数据
        initParkingData() {
            const spots = {};
            
            for (const garage of PARKING_STRUCTURE.garages) {
                spots[garage] = {};
                for (const level of PARKING_STRUCTURE.levels) {
                    spots[garage][level] = {};
                    for (let i = 1; i <= PARKING_STRUCTURE.spotsPerLevel; i++) {
                        spots[garage][level][i] = {
                            spotNumber: i,
                            isAvailable: true,
                            features: this.getSpotFeatures(i)
                        };
                    }
                }
            }
            
            return {
                structure: PARKING_STRUCTURE,
                spots: spots,
                lastUpdated: new Date().toISOString()
            };
        }

        // 获取车位特征
        getSpotFeatures(spotNumber) {
            const features = [];
            
            if (spotNumber <= 5) {
                features.push('near_exit');
            }
            if (spotNumber % 2 === 0) {
                features.push('wider_space');
            }
            if (spotNumber >= 20) {
                features.push('quiet_area');
            }
            
            return features;
        }

        // 保存停车场数据
        async saveParkingData() {
            if (parkingData) {
                parkingData.lastUpdated = new Date().toISOString();
                localStorage.setItem('parking_structure', JSON.stringify(parkingData));
            }
        }

        // 获取车库列表
        async getGarages() {
            const data = await this.getParkingData();
            return data.structure.garages;
        }

        // 获取层数列表
        async getLevels() {
            const data = await this.getParkingData();
            return data.structure.levels;
        }

        // 获取指定车库和层数的所有车位
        async getSpots(garage, level) {
            const data = await this.getParkingData();
            if (data.spots[garage] && data.spots[garage][level]) {
                return data.spots[garage][level];
            }
            return {};
        }

        // 获取指定车位信息
        async getSpot(garage, level, spotNumber) {
            const spots = await this.getSpots(garage, level);
            return spots[spotNumber] || null;
        }

        // 更新车位状态
        async updateSpotStatus(garage, level, spotNumber, isAvailable) {
            const data = await this.getParkingData();
            if (data.spots[garage] && data.spots[garage][level] && data.spots[garage][level][spotNumber]) {
                data.spots[garage][level][spotNumber].isAvailable = isAvailable;
                data.spots[garage][level][spotNumber].lastUpdated = new Date().toISOString();
                await this.saveParkingData();
                return true;
            }
            return false;
        }

        // 批量更新车位状态
        async batchUpdateSpotStatus(updates) {
            const data = await this.getParkingData();
            let updated = 0;
            
            for (const update of updates) {
                const { garage, level, spotNumber, isAvailable } = update;
                if (data.spots[garage] && data.spots[garage][level] && data.spots[garage][level][spotNumber]) {
                    data.spots[garage][level][spotNumber].isAvailable = isAvailable;
                    data.spots[garage][level][spotNumber].lastUpdated = new Date().toISOString();
                    updated++;
                }
            }
            
            if (updated > 0) {
                await this.saveParkingData();
            }
            return updated;
        }

        // 获取统计数据
        async getStatistics() {
            const data = await this.getParkingData();
            let totalSpots = 0;
            let availableSpots = 0;
            
            for (const garage of data.structure.garages) {
                for (const level of data.structure.levels) {
                    for (let i = 1; i <= data.structure.spotsPerLevel; i++) {
                        totalSpots++;
                        if (data.spots[garage][level][i].isAvailable) {
                            availableSpots++;
                        }
                    }
                }
            }
            
            return {
                totalSpots: totalSpots,
                availableSpots: availableSpots,
                occupiedSpots: totalSpots - availableSpots,
                occupancyRate: ((totalSpots - availableSpots) / totalSpots * 100).toFixed(1),
                hourlyRate: data.structure.hourlyRate
            };
        }

        // 获取车位特征描述
        getSpotFeaturesDescription(features) {
            const descriptions = {
                near_exit: '靠近出口',
                wider_space: '车位较宽',
                quiet_area: '安静区域'
            };
            
            return features.map(f => descriptions[f] || f).join('、');
        }
    }

    // 导出API
    window.ParkingDataAPI = new ParkingDataAPI();
})();