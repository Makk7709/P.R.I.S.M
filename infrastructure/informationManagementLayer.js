import fs from 'fs';
import path from 'path';
import { createLogger, format, transports } from 'winston';

// Constants
const MODES = {
    TEST: 'TEST',
    PROD: 'PROD'
};

const PATHS = {
    TEST: {
        LOGS: '/logs/test/',
        SUMMARIES: '/archives/test_summaries/'
    },
    PROD: {
        LOGS: '/logs/',
        SUMMARIES: '/archives/'
    }
};

// Logger configuration
const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp(),
        format.json()
    ),
    transports: [
        new transports.Console({
            format: format.combine(
                format.colorize(),
                format.simple()
            )
        })
    ]
});

export class InformationManagementLayer {
    constructor() {
        this.currentMode = process.env.PRISM_MODE || MODES.TEST;
        this.validateMode();
        this.initializeDirectories();
        this.logModeChange();
    }

    validateMode() {
        if (!Object.values(MODES).includes(this.currentMode)) {
            throw new Error(`Invalid PRISM_MODE: ${this.currentMode}. Must be either ${MODES.TEST} or ${MODES.PROD}`);
        }
    }

    initializeDirectories() {
        const directories = [
            PATHS.TEST.LOGS,
            PATHS.TEST.SUMMARIES,
            PATHS.PROD.LOGS,
            PATHS.PROD.SUMMARIES
        ];

        directories.forEach(dir => {
            const fullPath = path.join(process.cwd(), dir);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
            }
        });
    }

    logModeChange() {
        logger.info(`PRISM Mode initialized: ${this.currentMode}`);
    }

    routeData(payload) {
        if (!payload || typeof payload !== 'object') {
            throw new Error('Invalid payload: Must be a non-null object');
        }

        const { type, data, destination } = payload;

        if (this.currentMode === MODES.TEST) {
            return this.handleTestMode(type, data, destination);
        } else {
            return this.handleProdMode(type, data, destination);
        }
    }

    handleTestMode(type, data, destination) {
        // Prevent any writes to awareness engine in test mode
        if (destination === 'awarenessEngine') {
            logger.warn('Attempted write to awareness engine in TEST mode - operation blocked');
            return {
                success: false,
                message: 'Writing to awareness engine is not allowed in TEST mode'
            };
        }

        // Route test data to appropriate test directories
        const testPath = type === 'log' ? PATHS.TEST.LOGS : PATHS.TEST.SUMMARIES;
        const fullPath = path.join(process.cwd(), testPath, `${Date.now()}.json`);

        try {
            fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
            logger.info(`Test data written to: ${fullPath}`);
            return {
                success: true,
                path: fullPath
            };
        } catch (error) {
            logger.error(`Error writing test data: ${error.message}`);
            throw error;
        }
    }

    handleProdMode(type, data, _destination) {
        // Normal production routing
        const prodPath = type === 'log' ? PATHS.PROD.LOGS : PATHS.PROD.SUMMARIES;
        const fullPath = path.join(process.cwd(), prodPath, `${Date.now()}.json`);

        try {
            fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
            logger.info(`Production data written to: ${fullPath}`);
            return {
                success: true,
                path: fullPath
            };
        } catch (error) {
            logger.error(`Error writing production data: ${error.message}`);
            throw error;
        }
    }

    getCurrentMode() {
        return this.currentMode;
    }

    setMode(newMode) {
        if (!Object.values(MODES).includes(newMode)) {
            throw new Error(`Invalid mode: ${newMode}`);
        }

        const oldMode = this.currentMode;
        this.currentMode = newMode;
        this.logModeChange();
        
        logger.info(`PRISM Mode changed from ${oldMode} to ${newMode}`);
        return this.currentMode;
    }
}

// Export singleton instance
const infoLayer = new InformationManagementLayer();
export default infoLayer; 