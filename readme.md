# Events Utilities for Slate Utility Programs

Provides events processing functionality for Slate Utility Programs, e.g. [slate-replicator](https://github.com/elm-slate/slate-replicator).

Requires node 6 or greater.

## Installation
> npm install git://github.com/elm-slate/db-events

## package.json usage
To include the latest version of db-events in your program use:

```json
  "dependencies": {
    "@elm-slate/db-events": "git://github.com/elm-slate/db-events.git",
  }
```

To use a specific version:

```json
  "dependencies": {
    "@elm-slate/db-events": "git://github.com/elm-slate/db-events.git#0.1.9",
  }
```

## API

- [`createInsertEventsSQLStatement`](#createInsertEventsSQLStatement)
- [`getEventCount`](#getEventCount)
- [`getEventsFromStream`](#getEventsFromStream)
- [`getMaximumEventId`](#getMaximumEventId)

---

<a name="createInsertEventsSQLStatement"></a>
### createInsertEventsSQLStatement (events)

Returns a SQL statement created from the `events` array that can be used to insert the events into an events table in a slate source database.

The slate source database, where events will be inserted, must have been created using [`init-slate-db`](https://github.com/elm-slate/init-slate-db) with `source` as the `--table-type option`.

#### Arguments

- `events` - An array of slate event objects or an array of slate event object arrays.

#### Example

``` javascript
const dbUtils = require('@elm-slate/db-utils');
const dbEvents = require('@elm-slate/db-events');
.
.
.
const events = [
    { target: 'entity',
        version: 0,
        entityId: '123',
        metadata: { command: 'asOneCmd', initiatorId: '999888777' },
        operation: 'created',
        entityName: 'Person' },
    { target: 'entity',
        version: 0,
        entityId: '456',
        metadata: { command: 'asOneCmd', initiatorId: '999888777' },
        operation: 'created',
        entityName: 'Person' }
];
const someFunction = co.wrap(function *(client) {
	const insertStatement = dbEvents.createInsertEventsSQLStatement(events);
	const result = yield dbUtils.executeSQLStatement(client, insertStatement);
	if (result.rowCount === 1) {
		var row1 = result.rows[0];
		if (!(row1['insert_events'] && row1['insert_events'] === events.length)) {
			throw new Error(`Program logic error.  Event count doesn't match rows inserted.  Event Count:  ${events.length}  Rows Inserted:  ${row1['insert_events']}`);
		}
	}
	else {
		throw new Error = `Program logic error.  Expected result array of one object to be returned.  Result:  ${JSON.stringify(result)}`;
	}
});
```

<a name="getEventCount"></a>
### getEventCount (client)

Returns the event count of the events table in the database referred to by `client`.

#### Arguments

- `client` - The object returned from calling `createClient(connectionString)` or `createPooledClient(connectionString).dbClient` in [`db-utils`](https://github.com/elm-slate/db-utils).

#### Example

``` javascript
const dbUtils = require('@elm-slate/db-utils');
const dbEvents = require('@elm-slate/db-events');
.
.
.
const someFunction = co.wrap(function *(client) {
	const count = yield dbEvents.getEventCount(client);
    .
    .
    .
});
```

<a name="getEventsFromStream"></a>
### getEventsFromStream (eventStream, maxEvents)

Returns an array of events read from the `eventStream` or an empty array when no events are left in the stream.  At most `maxEvents` events will be returned in the array.

#### Arguments

- `eventStream` - The event stream returned from calling `createQueryStream` in [`db-utils`](https://github.com/elm-slate/db-utils).
- `maxEvents` - The maximum number of events to be retrieved from the eventStream.

#### Example

***Note `yieldToEventLoop` is used here to make sure that huge result sets will not become CPU-bound.***

``` javascript
const dbUtils = require('@elm-slate/db-utils');
const dbEvents = require('@elm-slate/db-events');
.
.
.
yieldToEventLoop: () => {
    return new Promise((resolve) => {
        setImmediate(() => resolve());
    });
}

const someFunction = co.wrap(function *(connectionString) {
	let pooledDbClient;
	try {
		pooledDbClient = yield dbUtils.createPooledClient(connectionString);
		const selectStatement = `SELECT id, ts, event FROM events
								WHERE id > 100 ORDER BY id`;
		// get object stream of rows from select statement
		const eventStream = dbUtils.createQueryStream(pooledDbClient.dbClient, selectStatement);
        do {
            // get up to 50 events from the eventStream
            var result = yield dbEvents.getEventsFromStream(eventStream, 50);
            // handle any events returned in the array (result.events);
            .
            .
            .
            // call the following function to yield back to node from the loop if many events will be returned from the
            // selectStatement
            yieldToEventLoop();
        } while (!result.endOfStream);
    }
    finally {
		if (pooledEventSourceDbClient) {
			dbUtils.close(pooledEventSourceDbClient);
		}
	}
});
```

<a name="getMaximumEventId"></a>
### getMaximumEventId (client)

Returns the maximum value of the id column in the events table in the database referred to by `client`.

#### Arguments

- `client` - The object returned from calling `createClient(connectionString)` or `createPooledClient(connectionString).dbClient` in [`db-utils`](https://github.com/elm-slate/db-utils).

#### Example

``` javascript
const dbUtils = require('@elm-slate/db-utils');
const dbEvents = require('@elm-slate/db-events');
.
.
.
const someFunction = co.wrap(function *(client) {
	const maxId = yield dbEvents.getMaximumEventId(client);
    .
    .
    .
});
```
