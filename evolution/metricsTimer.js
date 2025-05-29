class MetricsTimer {
    constructor() {
        this.startTime = null;
        this.endTime = null;
    }

    startTimer() {
        this.startTime = process.hrtime();
        return this.startTime;
    }

    endTimer() {
        if (!this.startTime) {
            throw new Error('Timer was not started');
        }

        this.endTime = process.hrtime(this.startTime);
        const duration = (this.endTime[0] * 1000) + (this.endTime[1] / 1000000); // Convert to milliseconds
        return duration;
    }

    getDuration() {
        if (!this.startTime) {
            throw new Error('Timer was not started');
        }

        if (!this.endTime) {
            const currentTime = process.hrtime(this.startTime);
            return (currentTime[0] * 1000) + (currentTime[1] / 1000000);
        }

        return (this.endTime[0] * 1000) + (this.endTime[1] / 1000000);
    }

    reset() {
        this.startTime = null;
        this.endTime = null;
    }
}

module.exports = { MetricsTimer }; 