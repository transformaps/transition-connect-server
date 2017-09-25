'use strict';

let db = require('../db');
let dbConnectionHandling = require('./dbConnectionHandling');

let createOrganization = function (organizationId, data) {
    data.name = data.name || `organization${organizationId}Name`;
    data.description = data.description || `org${organizationId}description`;
    data.website = data.website || `www.link${organizationId}.org`;
    data.slogan = data.slogan || `best${organizationId}Org`;
    data.modified = data.modified || data.created;
    data.lastConfigUpdate = data.lastConfigUpdate || null;
    dbConnectionHandling.getCommands().push(db.cypher()
        .match(`(np:NetworkingPlatform {platformId: {platformId}})`)
        .createUnique(`(np)-[:CREATED]->(org:Organization {organizationId: {organizationId}, name: {name}, 
                       description: {description}, slogan: {slogan}, website: {website}, 
                       created: {created}, modified: {modified}, lastConfigUpdate: {lastConfigUpdate}})`)
        .with(`org`)
        .match(`(admin:Admin)`)
        .where(`admin.adminId IN {adminIds}`)
        .createUnique(`(admin)-[:IS_ADMIN]->(org)`)
        .end({
            organizationId: organizationId, platformId: data.networkingPlatformId,
            name: data.name, adminIds: data.adminIds, created: data.created, modified: data.modified,
            lastConfigUpdate: data.lastConfigUpdate,
            description: data.description, website: data.website, slogan: data.slogan
        }).getCommand());
};

let assignOrganizationToCategory = function (data) {
    data.lastConfigUpdate = data.lastConfigUpdate || 500;
    dbConnectionHandling.getCommands().push(db.cypher()
        .match(`(org:Organization {organizationId: {organizationId}}), (np:NetworkingPlatform {platformId: {npId}})`)
        .merge(`(org)-[:ASSIGNED]->(assigner:CategoryAssigner {lastConfigUpdate: {lastConfigUpdate}})-[:ASSIGNED]->(np)`)
        .with(`assigner`)
        .match(`(category:Category)`)
        .where(`category.categoryId IN {categories}`)
        .createUnique(`(assigner)-[:ASSIGNED]->(category)`)
        .end({
            organizationId: data.organizationId, lastConfigUpdate: data.lastConfigUpdate,
            categories: data.categories, npId: data.npId
        }).getCommand());
};

let exportOrgToNp = function (data) {
    data.exportTimestamp = data.exportTimestamp || null;
    data.exportStatus = data.exportStatus || ':EXPORT';
    dbConnectionHandling.getCommands().push(db.cypher()
        .match(`(org:Organization {organizationId: {organizationId}}), (np:NetworkingPlatform {platformId: {npId}})`)
        .createUnique(`(org)-[${data.exportStatus} {exportTimestamp: {exportTimestamp}}]->(np)`)
        .end({
            organizationId: data.organizationId, npId: data.npId, exportTimestamp: data.exportTimestamp
        }).getCommand());
};

let exportRequestOrgToNp = function (data) {
    dbConnectionHandling.getCommands().push(db.cypher()
        .match(`(org:Organization {organizationId: {organizationId}}), (np:NetworkingPlatform {platformId: {npId}})`)
        .createUnique(`(org)-[:EXPORT_REQUEST]->(np)`)
        .end({
            organizationId: data.organizationId, npId: data.npId
        }).getCommand());
};

module.exports = {
    createOrganization,
    assignOrganizationToCategory,
    exportOrgToNp,
    exportRequestOrgToNp
};