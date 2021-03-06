'use strict';

let connectionHandler = requireConnectionHandler('connectionHandler');
let dbDsl = require('server-test-util').dbDSL;
let db = require('server-test-util').db;
let requestHandler = require('server-test-util').requestHandler;
let moment = require('moment');
let nock = require('nock');

describe('Integration Tests for importing events from a website in iCal format', function () {

    let startTime;

    beforeEach(async function () {
        startTime = Math.floor(moment.utc().valueOf() / 1000);
        await dbDsl.init();
        dbDsl.createAdmin('1', {email: 'user@irgendwo.ch'});
        dbDsl.createAdmin('2', {email: 'user2@irgendwo.ch'});

        dbDsl.createNetworkingPlatform('1', {adminIds: ['1'], name: 'Elyoos', description: 'description', link: 'www.link.org'});

        dbDsl.createOrganization('1', {
            networkingPlatformId: '1', adminIds: ['2'], created: 500,
            eventsImportConfiguration: 'http://www.test.ch/import/organization'
        });
    });

    afterEach(function () {
        return requestHandler.logout();
    });

    it('Import new iCal events (all properties)', async function () {

        nock(`http://www.test.ch`).get('/import/organization')
            .reply(200,
                `BEGIN:VCALENDAR
                VERSION:2.0
                CALSCALE:GREGORIAN
                METHOD:PUBLISH
                X-WR-CALNAME:test@gmail.com
                X-WR-TIMEZONE:Europe/Zurich
                BEGIN:VEVENT
DTSTAMP:19970610T172345Z
                DTSTART:20171215T135501Z
                DTEND:20171215T145002Z
                UID:0c6ckli6gauhsp76ju1vl065dd@google.com
                CREATED:20171025T150112Z
                DESCRIPTION:Hat was mit TC zu tun\nGanz viel
                LAST-MODIFIED:20171025T150112Z
                LOCATION:Irgendwo in Zürich
                SEQUENCE:0
                STATUS:CONFIRMED
                SUMMARY:Event1 Test
                TRANSP:OPAQUE
                END:VEVENT
                BEGIN:VEVENT
DTSTAMP:19970610T172346Z
                DTSTART;VALUE=DATE:20171214
                DTEND;VALUE=DATE:20171215
                UID:1c6ckli6gauhsp76ju1vl065dd@google.com
                CREATED:20171025T1501121Z
                DESCRIPTION:Hat auch was mit TC zu tun
                LAST-MODIFIED:20171025T150112Z
                LOCATION:Irgendwo in Urdorf
                SEQUENCE:0
                STATUS:CONFIRMED
                SUMMARY:Event2 Test
                TRANSP:OPAQUE
                END:VEVENT
                END:VCALENDAR`
            );

        await dbDsl.sendToDb();
        await connectionHandler.startSync();
        let resp = await db.cypher().match("(org:Organization {organizationId: '1'})-[:WEBSITE_EVENT]->(event:Event)")
            .return(`event`).orderBy(`event.uid`).end().send();

        resp.length.should.equals(2);
        resp[0].event.uid.should.equals('0c6ckli6gauhsp76ju1vl065dd@google.com');
        resp[0].event.description.should.equals('Hat was mit TC zu tun\nGanz viel');
        resp[0].event.summary.should.equals('Event1 Test');
        resp[0].event.location.should.equals('Irgendwo in Zürich');
        resp[0].event.startDate.should.equals(1513346101);
        resp[0].event.endDate.should.equals(1513349402);
        resp[0].event.modified.should.at.least(startTime);
        resp[0].event.iCal.should.equals(`BEGIN:VEVENT
DTSTAMP:19970610T172345Z
                DTSTART:20171215T135501Z
                DTEND:20171215T145002Z
                UID:0c6ckli6gauhsp76ju1vl065dd@google.com
                CREATED:20171025T150112Z
                DESCRIPTION:Hat was mit TC zu tun\nGanz viel
                LAST-MODIFIED:20171025T150112Z
                LOCATION:Irgendwo in Zürich
                SEQUENCE:0
                STATUS:CONFIRMED
                SUMMARY:Event1 Test
                TRANSP:OPAQUE
                END:VEVENT`);
        resp[0].event.iCalCompare.should.equals(`BEGIN:VEVENT
                DTSTART:20171215T135501Z
                DTEND:20171215T145002Z
                UID:0c6ckli6gauhsp76ju1vl065dd@google.com
                CREATED:20171025T150112Z
                DESCRIPTION:Hat was mit TC zu tun\nGanz viel
                LAST-MODIFIED:20171025T150112Z
                LOCATION:Irgendwo in Zürich
                SEQUENCE:0
                STATUS:CONFIRMED
                SUMMARY:Event1 Test
                TRANSP:OPAQUE
                END:VEVENT`);
        resp[1].event.uid.should.equals('1c6ckli6gauhsp76ju1vl065dd@google.com');
        resp[1].event.description.should.equals('Hat auch was mit TC zu tun');
        resp[1].event.summary.should.equals('Event2 Test');
        resp[1].event.location.should.equals('Irgendwo in Urdorf');
        resp[1].event.modified.should.at.least(startTime);
        resp[1].event.startDate.should.equals(1513209600);
        resp[1].event.endDate.should.equals(1513296000);
        resp[1].event.iCal.should.equals(`BEGIN:VEVENT
DTSTAMP:19970610T172346Z
                DTSTART;VALUE=DATE:20171214
                DTEND;VALUE=DATE:20171215
                UID:1c6ckli6gauhsp76ju1vl065dd@google.com
                CREATED:20171025T1501121Z
                DESCRIPTION:Hat auch was mit TC zu tun
                LAST-MODIFIED:20171025T150112Z
                LOCATION:Irgendwo in Urdorf
                SEQUENCE:0
                STATUS:CONFIRMED
                SUMMARY:Event2 Test
                TRANSP:OPAQUE
                END:VEVENT`);
        resp[1].event.iCalCompare.should.equals(`BEGIN:VEVENT
                DTSTART;VALUE=DATE:20171214
                DTEND;VALUE=DATE:20171215
                UID:1c6ckli6gauhsp76ju1vl065dd@google.com
                CREATED:20171025T1501121Z
                DESCRIPTION:Hat auch was mit TC zu tun
                LAST-MODIFIED:20171025T150112Z
                LOCATION:Irgendwo in Urdorf
                SEQUENCE:0
                STATUS:CONFIRMED
                SUMMARY:Event2 Test
                TRANSP:OPAQUE
                END:VEVENT`);

    });

    it('Import modified iCal event', async function () {

        let normalStartUtcTimestamp = Math.floor(moment.utc().valueOf() / 1000) - 500,
            normalEndUtcTimestamp = normalStartUtcTimestamp + 1000;

        dbDsl.createWebsiteEvent('0c6ckli6gauhsp76ju1vl065dd@google.com', {organizationId: '1', summary: 'Event1 Test',
            description: 'Hat was mit TC zu tun', location: 'Irgendwo in Zürich', startDate: normalStartUtcTimestamp,
            endDate: normalEndUtcTimestamp,
            iCal: `BEGIN:VEVENT
DTSTAMP:19970610T172345Z
                DTSTART:${moment.utc(normalStartUtcTimestamp * 1000).format('YYYYMMDDTHHmmss')}Z
                DTEND:${moment.utc(normalEndUtcTimestamp * 1000).format('YYYYMMDDTHHmmss')}Z
                UID:0c6ckli6gauhsp76ju1vl065dd@google.com
                CREATED:20171025T150112Z
                DESCRIPTION:Hat was mit TC zu tun
                LAST-MODIFIED:20171025T150112Z
                LOCATION:Irgendwo in Zürich
                SEQUENCE:0
                STATUS:CONFIRMED
                SUMMARY:Event1 Test
                TRANSP:OPAQUE
                END:VEVENT`});

        nock(`http://www.test.ch`).get('/import/organization')
            .reply(200,
                `BEGIN:VCALENDAR
                VERSION:2.0
                CALSCALE:GREGORIAN
                METHOD:PUBLISH
                X-WR-CALNAME:test@gmail.com
                X-WR-TIMEZONE:Europe/Zurich
                BEGIN:VEVENT
DTSTAMP:19970610T172345Z
                DTSTART:${moment.utc((normalStartUtcTimestamp + 1) * 1000).format('YYYYMMDDTHHmmss')}Z
                DTEND:${moment.utc((normalEndUtcTimestamp + 1) * 1000).format('YYYYMMDDTHHmmss')}Z
                UID:0c6ckli6gauhsp76ju1vl065dd@google.com
                CREATED:20171025T150112Z
                DESCRIPTION:Hat was mit TC zu tun2
                LAST-MODIFIED:20171025T150112Z
                LOCATION:Irgendwo in Zürich2
                SEQUENCE:0
                STATUS:CONFIRMED
                SUMMARY:Event1 Test2
                TRANSP:OPAQUE
                END:VEVENT
                END:VCALENDAR`
            );

        await dbDsl.sendToDb();
        await connectionHandler.startSync();
        let resp = await db.cypher().match("(org:Organization {organizationId: '1'})-[:WEBSITE_EVENT]->(event:Event)")
            .return(`event`).orderBy(`event.uid`).end().send();

        resp.length.should.equals(1);
        resp[0].event.uid.should.equals('0c6ckli6gauhsp76ju1vl065dd@google.com');
        resp[0].event.description.should.equals('Hat was mit TC zu tun2');
        resp[0].event.summary.should.equals('Event1 Test2');
        resp[0].event.location.should.equals('Irgendwo in Zürich2');
        resp[0].event.modified.should.at.least(startTime);
        resp[0].event.startDate.should.equals(normalStartUtcTimestamp + 1);
        resp[0].event.endDate.should.equals(normalEndUtcTimestamp + 1);
        resp[0].event.iCal.should.equals(`BEGIN:VEVENT
DTSTAMP:19970610T172345Z
                DTSTART:${moment.utc((normalStartUtcTimestamp + 1) * 1000).format('YYYYMMDDTHHmmss')}Z
                DTEND:${moment.utc((normalEndUtcTimestamp + 1) * 1000).format('YYYYMMDDTHHmmss')}Z
                UID:0c6ckli6gauhsp76ju1vl065dd@google.com
                CREATED:20171025T150112Z
                DESCRIPTION:Hat was mit TC zu tun2
                LAST-MODIFIED:20171025T150112Z
                LOCATION:Irgendwo in Zürich2
                SEQUENCE:0
                STATUS:CONFIRMED
                SUMMARY:Event1 Test2
                TRANSP:OPAQUE
                END:VEVENT`);
        resp[0].event.iCalCompare.should.equals(`BEGIN:VEVENT
                DTSTART:${moment.utc((normalStartUtcTimestamp + 1) * 1000).format('YYYYMMDDTHHmmss')}Z
                DTEND:${moment.utc((normalEndUtcTimestamp + 1) * 1000).format('YYYYMMDDTHHmmss')}Z
                UID:0c6ckli6gauhsp76ju1vl065dd@google.com
                CREATED:20171025T150112Z
                DESCRIPTION:Hat was mit TC zu tun2
                LAST-MODIFIED:20171025T150112Z
                LOCATION:Irgendwo in Zürich2
                SEQUENCE:0
                STATUS:CONFIRMED
                SUMMARY:Event1 Test2
                TRANSP:OPAQUE
                END:VEVENT`);
    });

    it('Do not import unchanged iCal event', async function () {

        let normalStartUtcTimestamp = Math.floor(moment.utc().valueOf() / 1000) - 500,
            normalEndUtcTimestamp = normalStartUtcTimestamp + 1000;

        dbDsl.createWebsiteEvent('0c6ckli6gauhsp76ju1vl065dd@google.com', {organizationId: '1', summary: 'Event1 Test',
            description: 'Hat was mit TC zu tun', location: 'Irgendwo in Zürich', startDate: normalStartUtcTimestamp,
            endDate: normalEndUtcTimestamp,
            iCal: `BEGIN:VEVENT
DTSTAMP:19970610T172344Z
                DTSTART:${moment.utc(normalStartUtcTimestamp * 1000).format('YYYYMMDDTHHmmss')}Z
                DTEND:${moment.utc(normalEndUtcTimestamp * 1000).format('YYYYMMDDTHHmmss')}Z
                UID:0c6ckli6gauhsp76ju1vl065dd@google.com
                CREATED:20171025T150112Z
                DESCRIPTION:Hat was mit TC zu tun
                LAST-MODIFIED:20171025T150112Z
                LOCATION:Irgendwo in Zürich
                SEQUENCE:0
                STATUS:CONFIRMED
                SUMMARY:Event1 Test
                TRANSP:OPAQUE
                END:VEVENT`});

        nock(`http://www.test.ch`).get('/import/organization')
            .reply(200,
                `BEGIN:VCALENDAR
                VERSION:2.0
                CALSCALE:GREGORIAN
                METHOD:PUBLISH
                X-WR-CALNAME:test@gmail.com
                X-WR-TIMEZONE:Europe/Zurich
                BEGIN:VEVENT
DTSTAMP:20970610T172345Z
                DTSTART:${moment.utc((normalStartUtcTimestamp) * 1000).format('YYYYMMDDTHHmmss')}Z
                DTEND:${moment.utc((normalEndUtcTimestamp) * 1000).format('YYYYMMDDTHHmmss')}Z
                UID:0c6ckli6gauhsp76ju1vl065dd@google.com
                CREATED:20171025T150112Z
                DESCRIPTION:Hat was mit TC zu tun
                LAST-MODIFIED:20171025T150112Z
                LOCATION:Irgendwo in Zürich
                SEQUENCE:0
                STATUS:CONFIRMED
                SUMMARY:Event1 Test
                TRANSP:OPAQUE
                END:VEVENT
                END:VCALENDAR`
            );

        await dbDsl.sendToDb();
        await connectionHandler.startSync();
        let resp = await db.cypher().match("(org:Organization {organizationId: '1'})-[:WEBSITE_EVENT]->(event:Event)")
            .return(`event`).orderBy(`event.uid`).end().send();

        resp.length.should.equals(1);
        resp[0].event.uid.should.equals('0c6ckli6gauhsp76ju1vl065dd@google.com');
        resp[0].event.description.should.equals('Hat was mit TC zu tun');
        resp[0].event.summary.should.equals('Event1 Test');
        resp[0].event.location.should.equals('Irgendwo in Zürich');
        resp[0].event.modified.should.equals(602);
        resp[0].event.startDate.should.equals(normalStartUtcTimestamp);
        resp[0].event.endDate.should.equals(normalEndUtcTimestamp);
        resp[0].event.iCal.should.equals(`BEGIN:VEVENT
DTSTAMP:19970610T172344Z
                DTSTART:${moment.utc((normalStartUtcTimestamp) * 1000).format('YYYYMMDDTHHmmss')}Z
                DTEND:${moment.utc((normalEndUtcTimestamp) * 1000).format('YYYYMMDDTHHmmss')}Z
                UID:0c6ckli6gauhsp76ju1vl065dd@google.com
                CREATED:20171025T150112Z
                DESCRIPTION:Hat was mit TC zu tun
                LAST-MODIFIED:20171025T150112Z
                LOCATION:Irgendwo in Zürich
                SEQUENCE:0
                STATUS:CONFIRMED
                SUMMARY:Event1 Test
                TRANSP:OPAQUE
                END:VEVENT`);
        resp[0].event.iCalCompare.should.equals(`BEGIN:VEVENT
                DTSTART:${moment.utc((normalStartUtcTimestamp) * 1000).format('YYYYMMDDTHHmmss')}Z
                DTEND:${moment.utc((normalEndUtcTimestamp) * 1000).format('YYYYMMDDTHHmmss')}Z
                UID:0c6ckli6gauhsp76ju1vl065dd@google.com
                CREATED:20171025T150112Z
                DESCRIPTION:Hat was mit TC zu tun
                LAST-MODIFIED:20171025T150112Z
                LOCATION:Irgendwo in Zürich
                SEQUENCE:0
                STATUS:CONFIRMED
                SUMMARY:Event1 Test
                TRANSP:OPAQUE
                END:VEVENT`);
    });

    it('Delete directly non existing event and not exported', async function () {

        let normalStartUtcTimestamp = Math.floor(moment.utc().valueOf() / 1000) - 500,
            normalEndUtcTimestamp = normalStartUtcTimestamp + 1000;

        dbDsl.createWebsiteEvent('0c6ckli6gauhsp76ju1vl065dd@google.com', {organizationId: '1', iCal: `BEGIN:VEVENT
                DTSTART:${moment.utc(normalStartUtcTimestamp * 1000).format('YYYYMMDDTHHmmss')}Z
                DTEND:${moment.utc(normalEndUtcTimestamp * 1000).format('YYYYMMDDTHHmmss')}Z
                UID:0c6ckli6gauhsp76ju1vl065dd@google.com
                CREATED:20171025T150112Z
                DESCRIPTION:Hat was mit TC zu tun
                LAST-MODIFIED:20171025T150112Z
                LOCATION:Irgendwo in Zürich
                SEQUENCE:0
                STATUS:CONFIRMED
                SUMMARY:Event1 Test
                TRANSP:OPAQUE
                END:VEVENT`});

        dbDsl.createWebsiteEvent('1', {organizationId: '1', iCal: `BEGIN:VEVENT
                DTSTART:${moment.utc(normalStartUtcTimestamp * 1000).format('YYYYMMDDTHHmmss')}Z
                DTEND:${moment.utc(normalEndUtcTimestamp * 1000).format('YYYYMMDDTHHmmss')}Z
                UID:1
                CREATED:20171025T150112Z
                DESCRIPTION:Hat was mit TC zu tun2
                LAST-MODIFIED:20171025T150112Z
                LOCATION:Irgendwo in Zürich2
                SEQUENCE:0
                STATUS:CONFIRMED
                SUMMARY:Event1 Test2
                TRANSP:OPAQUE
                END:VEVENT`});

        nock(`http://www.test.ch`).get('/import/organization')
            .reply(200,
                `BEGIN:VCALENDAR
                VERSION:2.0
                CALSCALE:GREGORIAN
                METHOD:PUBLISH
                X-WR-CALNAME:test@gmail.com
                X-WR-TIMEZONE:Europe/Zurich
                BEGIN:VEVENT
                DTSTART:${moment.utc(normalStartUtcTimestamp * 1000).format('YYYYMMDDTHHmmss')}Z
                DTEND:${moment.utc(normalEndUtcTimestamp * 1000).format('YYYYMMDDTHHmmss')}Z
                UID:0c6ckli6gauhsp76ju1vl065dd@google.com
                CREATED:20171025T150112Z
                DESCRIPTION:Hat was mit TC zu tun
                LAST-MODIFIED:20171025T150112Z
                LOCATION:Irgendwo in Zürich
                SEQUENCE:0
                STATUS:CONFIRMED
                SUMMARY:Event1 Test
                TRANSP:OPAQUE
                END:VEVENT
                END:VCALENDAR`
            );

        await dbDsl.sendToDb();
        await connectionHandler.startSync();
        let resp = await db.cypher().match("(org:Organization {organizationId: '1'})-[:WEBSITE_EVENT]->(event:Event)")
            .return(`event`).orderBy(`event.uid`).end().send();

        resp.length.should.equals(1);
        resp[0].event.uid.should.equals('0c6ckli6gauhsp76ju1vl065dd@google.com');
        resp[0].event.iCal.should.equals(`BEGIN:VEVENT
                DTSTART:${moment.utc(normalStartUtcTimestamp * 1000).format('YYYYMMDDTHHmmss')}Z
                DTEND:${moment.utc(normalEndUtcTimestamp * 1000).format('YYYYMMDDTHHmmss')}Z
                UID:0c6ckli6gauhsp76ju1vl065dd@google.com
                CREATED:20171025T150112Z
                DESCRIPTION:Hat was mit TC zu tun
                LAST-MODIFIED:20171025T150112Z
                LOCATION:Irgendwo in Zürich
                SEQUENCE:0
                STATUS:CONFIRMED
                SUMMARY:Event1 Test
                TRANSP:OPAQUE
                END:VEVENT`);
    });
});