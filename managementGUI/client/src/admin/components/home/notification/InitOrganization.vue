<template>
    <div class="init-organisation">
        <div class="action-title">
            <router-link :to="{name: 'orgConfig', params: {id: actionData.organizationId}}">
                {{actionData.organizationName}}
            </router-link> wurde noch nicht konfiguriert
        </div>
        <div class="notification-commands">
            <button type="button" class="btn btn-default"
                    v-on:click="$router.push({name: 'orgConfig', params: {id: actionData.organizationId}})">
                Konfigurieren
            </button>
        </div>
    </div>
</template>

<script>
    export default {
        props: ['actionData']
    }
</script>

<style lang="scss">
    @import "../../../../style/variable";

    .init-organisation {
        display: table;
        width: 100%;
        .action-title {
            display: table-cell;
            width: auto;
            vertical-align: middle;
            font-size: 16px;
            .org-name {
                cursor: pointer;
                font-weight: 500;
            }
            .org-name:hover {
                text-decoration: underline;
            }
        }
        .notification-commands {
            display: table-cell;
            vertical-align: middle;
            text-align: right;
            width: 175px;
            margin-top: 8px;
        }
    }
</style>
