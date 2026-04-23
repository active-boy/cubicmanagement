// 车位推荐算法
class ParkingAlgorithm {
    constructor(parkingData, reservations) {
        this.parkingData = parkingData;
        this.reservations = reservations || [];
    }

    // 主推荐函数
    recommendSpots(garage, level, startTime, endTime, limit = 5) {
        const availableSpots = this.getAvailableSpots(garage, level, startTime, endTime);
        
        // 为每个可用车位计算评分
        const scoredSpots = availableSpots.map(spot => ({
            ...spot,
            score: this.calculateSpotScore(spot, garage, level, startTime, endTime)
        }));
        
        // 按评分排序并返回前limit个
        scoredSpots.sort((a, b) => b.score - a.score);
        return scoredSpots.slice(0, limit);
    }

    // 获取可用车位
    getAvailableSpots(garage, level, startTime, endTime) {
        const availableSpots = [];
        const spotsPerLevel = 26;
        
        for (let i = 1; i <= spotsPerLevel; i++) {
            const spotNumber = i;
            const isAvailable = this.isSpotAvailable(garage, level, spotNumber, startTime, endTime);
            
            if (isAvailable) {
                availableSpots.push({
                    garage: garage,
                    level: level,
                    spotNumber: spotNumber,
                    spotId: `${garage}${level}-${spotNumber}`
                });
            }
        }
        
        return availableSpots;
    }

    // 检查车位是否可用
    isSpotAvailable(garage, level, spotNumber, startTime, endTime) {
        if (!this.reservations || this.reservations.length === 0) {
            return true;
        }
        
        const conflict = this.reservations.find(res => 
            res.garage === garage && 
            res.level === level && 
            res.spotNumber === spotNumber &&
            res.status !== 'cancelled' &&
            ((new Date(startTime) >= new Date(res.startTime) && new Date(startTime) < new Date(res.endTime)) ||
             (new Date(endTime) > new Date(res.startTime) && new Date(endTime) <= new Date(res.endTime)) ||
             (new Date(startTime) <= new Date(res.startTime) && new Date(endTime) >= new Date(res.endTime)))
        );
        return !conflict;
    }

    // 计算车位评分
    calculateSpotScore(spot, preferredGarage, preferredLevel, startTime, endTime) {
        let score = 100;
        
        // 因素1：位置便利性（靠近电梯/出口）
        score += this.getLocationScore(spot.spotNumber);
        
        // 因素2：历史预约热度（避免拥挤区域）
        score += this.getPopularityScore(spot);
        
        // 因素3：时间段兼容性
        score += this.getTimeCompatibilityScore(spot, startTime, endTime);
        
        // 因素4：用户偏好匹配
        if (spot.garage === preferredGarage) score += 20;
        if (spot.level == preferredLevel) score += 15;
        
        // 因素5：周边车位空闲情况
        score += this.getNeighborScore(spot, startTime, endTime);
        
        return Math.min(100, Math.max(0, score));
    }

    // 位置评分
    getLocationScore(spotNumber) {
        if (spotNumber <= 5) return 25;
        if (spotNumber <= 10) return 20;
        if (spotNumber <= 15) return 15;
        if (spotNumber <= 20) return 10;
        return 5;
    }

    // 热度评分
    getPopularityScore(spot) {
        if (!this.reservations) return 20;
        
        const historyCount = this.reservations.filter(res => 
            res.garage === spot.garage && 
            res.level === spot.level && 
            res.spotNumber === spot.spotNumber
        ).length;
        
        return Math.max(0, 20 - historyCount * 2);
    }

    // 时间兼容性评分
    getTimeCompatibilityScore(spot, startTime, endTime) {
        if (!this.reservations) return 15;
        
        const nearbyReservations = this.reservations.filter(res =>
            res.garage === spot.garage &&
            res.level === spot.level &&
            res.spotNumber === spot.spotNumber &&
            (Math.abs(new Date(res.startTime) - new Date(startTime)) < 3600000 ||
             Math.abs(new Date(res.endTime) - new Date(endTime)) < 3600000)
        );
        
        return Math.max(0, 15 - nearbyReservations.length * 3);
    }

    // 周边车位空闲评分
    getNeighborScore(spot, startTime, endTime) {
        if (!this.reservations) return 20;
        
        let neighborCount = 0;
        
        for (let offset of [-1, 1]) {
            const neighborSpot = spot.spotNumber + offset;
            if (neighborSpot >= 1 && neighborSpot <= 26) {
                const isNeighborAvailable = this.isSpotAvailable(
                    spot.garage, 
                    spot.level, 
                    neighborSpot, 
                    startTime, 
                    endTime
                );
                if (isNeighborAvailable) neighborCount++;
            }
        }
        
        return neighborCount * 10;
    }

    // 获取推荐理由
    getRecommendationReason(spot, score) {
        const reasons = [];
        
        if (spot.spotNumber <= 5) {
            reasons.push('靠近出入口，进出方便');
        } else if (spot.spotNumber <= 10) {
            reasons.push('位置适中，停车便利');
        } else if (spot.spotNumber >= 20) {
            reasons.push('空间宽敞，易于停放');
        } else {
            reasons.push('标准车位');
        }
        
        const neighborScore = this.getNeighborScore(spot, null, null);
        if (neighborScore > 15) {
            reasons.push('周边车位空闲');
        }
        
        if (reasons.length === 0) {
            reasons.push('推荐车位');
        }
        
        return reasons.join(' · ');
    }
}

// 导出算法类
window.ParkingAlgorithm = ParkingAlgorithm;