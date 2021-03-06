'use strict';

let db = require('server-lib').neo4j;
let _ = require('lodash');

let getUnchangedEvents = function (events, platformId) {
    return db.cypher().unwind(`{events} AS event`)
        .match(`(:NetworkingPlatform {platformId: {platformId}})-[:CREATED]->
                (:Organization)-[:EVENT]->(eventDb:Event {uid: event.uid})`)
        .where(`event.timestamp = eventDb.modifiedOnNp`)
        .return(`event.uid AS uid`)
        .end({events: events, platformId: platformId});
};

let getEventsToImport = async function (events, platformId) {
    let unchangedEvents = await getUnchangedEvents(events, platformId).send();
    return _.differenceBy(events, unchangedEvents, 'uid');
};

module.exports = {
    getEventsToImport
};
