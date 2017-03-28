const is = require('is_js');
const co = require('co');
const coread = require('co-read');
const R = require('ramda');
const dbUtils = require('@elm-slate/db-utils');

const parseInteger = s => {
	return R.cond([
		[R.curry(x => is.number(x) && is.integer(x)), x => x],
		[R.curry(x => is.string(x) && is.number(Number(x)) && is.integer(Number(x))), x => Number(x)],
		[R.T, x => {throw new Error(`${JSON.stringify(x)} is not an integer`);}]
	])(s);
};

const dbEvents = {
	getEventsFromStream: co.wrap(function *(eventStream, maxEvents) {
		var events = [];
		var endOfStream = false;
		while (events.length < maxEvents && !endOfStream) {
			var event = yield coread(eventStream);
			// event returned
			if (event) {
				events[events.length] = event;
			}
			// end of stream
			else {
				endOfStream = true;
			}
		}
		return {events: events, endOfStream: endOfStream};
	}),
	getMaximumEventId: co.wrap(function *(dbClient) {
		// it is assumed that the minimum value for the id column is 1
		const result = yield dbUtils.executeSQLStatement(dbClient, 'SELECT max(id) AS "maxId" FROM events');
		// no rows in table
		if (result.rowCount === 0) {
			return 0;
		}
		// maximum id found
		else if (result.rowCount === 1) {
			var maxId = result.rows[0].maxId;
			if (maxId === null) {
				return 0;
			}
			else {
				maxId = parseInteger(maxId);
			}
			// maximum id is valid
			if (maxId > 0) {
				return maxId;
			}
			// maximum id is invalid
			else {
				throw new Error(`Maximum events.id (${maxId}) is invalid for database ${dbClient.database}`)
			}
		}
		// row count returned from select is invalid
		else {
			throw new Error(`Row count (${result.rowCount}) returned for SELECT statement is invalid for database ${dbClient.database}`);
		}
	}),
	getEventCount: co.wrap(function *(dbClient) {
		const result = yield dbUtils.executeSQLStatement(dbClient, 'SELECT count(*) AS "count" FROM events');
		// no rows in table
		if (result.rowCount === 0) {
			return 0;
		}
		else if (result.rowCount === 1) {
			var count = result.rows[0].count;
			if (count === null) {
				return 0;
			}
			else {
				return parseInteger(count);
			}
		}
		// row count returned from select is invalid
		else {
			throw new Error(`Row count (${result.rowCount}) returned for SELECT statement is invalid for database ${dbClient.database}`);
		}
	}),
	// events is an array of events or an array of events arrays
	createInsertEventsSQLStatement: events => {
		const eventsToInsertValues = event => {
			// $1[idx] represents the parameter value for the id column where idx is a 1-based index starting at 1 needed by the insert_events SQL function.
			// $2 represents the parameter value for the ts column.
			insertValues[insertValues.length] = `($1[${insertValues.length + 1}], $2, ` + `'${JSON.stringify(event).replace(/'/g, '\'\'')}')`;
		};
		const insertValues = [];
		R.forEach(eventsToInsertValues, R.flatten(events));
		return `SELECT insert_events($$${R.join(',', insertValues)}$$)`;
	}
};

module.exports = dbEvents;
