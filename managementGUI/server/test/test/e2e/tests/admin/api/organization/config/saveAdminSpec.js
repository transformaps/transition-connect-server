'use strict';

let dbDsl = require('server-test-util').dbDSL;
let db = require('server-test-util').db;
let admin = require('server-test-util').admin;
let requestHandler = require('server-test-util').requestHandler;
let moment = require('moment');

describe('Integration Tests for adding and removing administrators of an organization', function () {

    let startTime;

    beforeEach(function () {
        startTime = Math.floor(moment.utc().valueOf() / 1000);
        return dbDsl.init().then(function () {
            dbDsl.createAdmin('1', {email: 'user@irgendwo.ch'});
            dbDsl.createAdmin('2', {email: 'user2@irgendwo.ch'});

            dbDsl.createNetworkingPlatform('1', {adminIds: ['1'], name: 'Elyoos', description: 'description', link: 'www.link.org'});

            dbDsl.createOrganization('1', {networkingPlatformId: '1', adminIds: ['2'], created: 500});
        });
    });

    afterEach(function () {
        return requestHandler.logout();
    });

    it('Add new admins to an organization', function () {

        dbDsl.createOrganization('2', {networkingPlatformId: '1', adminIds: ['1'], created: 502});

        return dbDsl.sendToDb().then(function () {
            return requestHandler.login(admin.validAdmin);
        }).then(function () {
            return requestHandler.put('/admin/api/organization/config/admin',
                {
                    organizationId: '2',
                    admins: ['user@irgendwo.ch', 'user2@irgendwo.ch', 'user3@irgendwo.ch']
                });
        }).then(function (res) {
            res.status.should.equal(200);
            return db.cypher().match("(:Organization {organizationId: '2'})<-[:IS_ADMIN]-(admin:Admin)")
                .return(`admin.email AS email, admin.adminId AS adminId`)
                .orderBy(`admin.email`).end().send();
        }).then(function (admins) {
            admins.length.should.equals(3);
            admins[0].email.should.equals('user2@irgendwo.ch');
            admins[0].adminId.should.equals('2');
            admins[1].email.should.equals('user3@irgendwo.ch');
            admins[1].adminId.should.exist;
            admins[2].email.should.equals('user@irgendwo.ch');
            admins[2].adminId.should.equals('1');
            return db.cypher().match("(:Organization {organizationId: '1'})<-[:IS_ADMIN]-(admin:Admin)")
                .return(`admin.email AS email`)
                .orderBy(`admin.email`).end().send();
        }).then(function (admins) {
            admins.length.should.equals(1);
            admins[0].email.should.equals('user2@irgendwo.ch');
            return db.cypher().match(`(admin:Admin)`).return(`admin`).end().send();
        }).then(function (admins) {
            admins.length.should.equals(3);
        });
    });

    it('Add new admin to an organization with different email writing', function () {

        dbDsl.createOrganization('2', {networkingPlatformId: '1', adminIds: ['1'], created: 502});

        return dbDsl.sendToDb().then(function () {
            return requestHandler.login(admin.validAdmin);
        }).then(function () {
            return requestHandler.put('/admin/api/organization/config/admin',
                {
                    organizationId: '2',
                    admins: ['user@irgendwo.ch', 'user2@Irgendwo.ch', 'user3@IRGENDWO.ch']
                });
        }).then(function (res) {
            res.status.should.equal(200);
            return db.cypher().match("(:Organization {organizationId: '2'})<-[:IS_ADMIN]-(admin:Admin)")
                .return(`admin.email AS email, admin.adminId AS adminId`)
                .orderBy(`admin.email`).end().send();
        }).then(function (admins) {
            admins.length.should.equals(3);
            admins[0].email.should.equals('user2@irgendwo.ch');
            admins[0].adminId.should.equals('2');
            admins[1].email.should.equals('user3@irgendwo.ch');
            admins[1].adminId.should.exist;
            admins[2].email.should.equals('user@irgendwo.ch');
            admins[2].adminId.should.equals('1');
            return db.cypher().match("(:Organization {organizationId: '1'})<-[:IS_ADMIN]-(admin:Admin)")
                .return(`admin.email AS email`)
                .orderBy(`admin.email`).end().send();
        }).then(function (admins) {
            admins.length.should.equals(1);
            admins[0].email.should.equals('user2@irgendwo.ch');
            return db.cypher().match(`(admin:Admin)`).return(`admin`).end().send();
        }).then(function (admins) {
            admins.length.should.equals(3);
        });
    });

    it('Add and remove admins from an organization', function () {

        dbDsl.createOrganization('2', {networkingPlatformId: '1', adminIds: ['1', '2'], created: 502});

        return dbDsl.sendToDb().then(function () {
            return requestHandler.login(admin.validAdmin);
        }).then(function () {
            return requestHandler.put('/admin/api/organization/config/admin',
                {
                    organizationId: '2',
                    admins: ['user@irgendwo.ch']
                });
        }).then(function (res) {
            res.status.should.equal(200);
            return db.cypher().match("(:Organization {organizationId: '2'})<-[:IS_ADMIN]-(admin:Admin)")
                .return(`admin.adminId AS adminId`)
                .orderBy(`adminId`).end().send();
        }).then(function (admins) {
            admins.length.should.equals(1);
            admins[0].adminId.should.equals('1');

            return db.cypher().match(`(admin:Admin)`).return(`admin`).end().send();
        }).then(function (admins) {
            admins.length.should.equals(2);
        });
    });

    it('No admin is not allowed', function () {

        dbDsl.createOrganization('2', {networkingPlatformId: '1', adminIds: ['1', '2'], created: 502});

        return dbDsl.sendToDb().then(function () {
            return requestHandler.login(admin.validAdmin);
        }).then(function () {
            return requestHandler.put('/admin/api/organization/config/admin',
                {
                    organizationId: '2',
                    admins: []
                });
        }).then(function (res) {
            res.status.should.equal(400);
        });
    });

    it('Only allow to add or remove administrator when administrator of organizations', function () {
        return dbDsl.sendToDb().then(function () {
            return requestHandler.login(admin.validAdmin);
        }).then(function () {
            return requestHandler.put('/admin/api/organization/config/admin',
                {
                    organizationId: '1',
                    admins: ['user@irgendwo.ch']
                });
        }).then(function (res) {
            res.status.should.equal(400);
        });
    });
});