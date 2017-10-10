'use strict';

let db = require('server-lib').neo4j;

let getNotificationResponse = function (notificationInitOrg, notificationAcceptOrg) {
    let resultNotifications = [];
    for (let notification of [...notificationInitOrg, ...notificationAcceptOrg]) {
        let resultNotification = {action: notification.action, actionData: {}};
        resultNotification.actionData.organizationName = notification.org.name;
        resultNotification.actionData.organizationId = notification.org.organizationId;
        resultNotification.actionData.nameNetworkingPlatform = notification.np.name;
        resultNotification.actionData.platformId = notification.np.platformId;
        resultNotifications.push(resultNotification);
    }
    return resultNotifications;
};

let getAcceptOrgNotification = function (adminId) {
    return db.cypher().match(`(:Admin {adminId: {adminId}})-[:IS_ADMIN]->(np:NetworkingPlatform)
                              <-[:EXPORT_REQUEST]-(org:Organization)`)
        .return(`np, org, 'EXPORT_REQUEST' AS action`)
        .end({adminId: adminId}).getCommand();
};

let getInitOrganisationNotification = function (adminId) {
    return db.cypher().match(`(np:NetworkingPlatform)-[:CREATED]->(org:Organization)<-[:IS_ADMIN]
                              -(:Admin {adminId: {adminId}})`)
        .where(`NOT EXISTS(org.lastConfigUpdate)`)
        .return(`np, org, 'INIT_ORGANISATION' AS action`)
        .end({adminId: adminId}).getCommand();
};

module.exports = {
    getInitOrganisationNotification,
    getAcceptOrgNotification,
    getNotificationResponse
};
