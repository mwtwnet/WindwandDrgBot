import dotenv from 'dotenv';
import { configCheck } from '@function/checker.js';
import { loadCommands, loadEvents, loadTriggers } from '@function/loader.js';
import logger from '@function/log.js';
import MyClient from '@utils/myClient.js';

dotenv.config();

const client = new MyClient();

async function init() {
	// Config Check
	const isConfigValid = await configCheck();
	if (!isConfigValid) {
		logger.error('Initialization aborted due to config errors.');
		process.exit(1);
	}


	logger.line();

	//===== Load Commands
	await loadCommands(client);

	//===== Load Triggers
	await loadTriggers(client);

	//===== Load Events and Utils
	await loadEvents(client);

	//===== Login to Discord

	client.login(process.env.TOKEN);

	//===== Exit Handler

	process.on('SIGINT', async () => {
		logger.warn('Caught interrupt signal, shutting down...');
		process.exit();
	});

	//===== Prevent Process Exit

	process.on('uncaughtException', (error) => {
		logger.error('Uncaught Exception:');
		console.error(error);
		// logger.saveErrorLog(error, 'uncaughtException');
		logger.warn('Process will continue running...');
	});

	process.on('unhandledRejection', (reason, promise) => {
		logger.error('Unhandled Rejection at:');
		console.error(promise);
		logger.error('Reason:');
		console.error(reason);

		// logger.saveErrorLog(reason instanceof Error ? reason : String(reason), 'unhandledRejection', { promise: String(promise) });
		logger.warn('Process will continue running...');
	});

}

init();
