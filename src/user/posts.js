"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const database_1 = __importDefault(require("../database"));
// import db = require('../database');
const meta_1 = __importDefault(require("../meta"));
// import meta = require('../meta');
const privileges_1 = __importDefault(require("../privileges"));
module.exports = function (User) {
    async function isReady(uid, cid, field) {
        if (parseInt(uid, 10) === 0) {
            return;
        }
        const [userData, isAdminOrMod] = await Promise.all([
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            User.getUserFields(uid, ['uid', 'mutedUntil', 'joindate', 'email', 'reputation'].concat([field])),
            privileges_1.default.categories.isAdminOrMod(cid, uid),
        ]);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (!userData.uid) {
            throw new Error('[[error:no-user]]');
        }
        if (isAdminOrMod) {
            return;
        }
        const now = Date.now();
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (userData.mutedUntil > now) {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            let muteLeft = ((userData.mutedUntil - now) / (1000 * 60));
            if (muteLeft > 60) {
                muteLeft = +(muteLeft / 60).toFixed(0);
                throw new Error(`[[error:user-muted-for-hours, ${muteLeft}]]`);
            }
            else {
                throw new Error(`[[error:user-muted-for-minutes, ${+muteLeft.toFixed(0)}]]`);
            }
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const initialpostdelay = meta_1.default.config.initialPostDelay;
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (now - userData.joindate < meta_1.default.config.initialPostDelay * 1000) {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            throw new Error(`[[error:user-too-new, ${initialpostdelay}]]`);
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const lasttime = userData[field] || 0;
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const newbiepostdelay = meta_1.default.config.newbiePostDelay;
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const newbiepostdelaythreshold = meta_1.default.config.newbiePostDelayThreshold;
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const postdelay = meta_1.default.config.postDelay;
        if (
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        meta_1.default.config.newbiePostDelay > 0 &&
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            meta_1.default.config.newbiePostDelayThreshold > userData.reputation &&
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            now - lasttime < meta_1.default.config.newbiePostDelay * 1000) {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            throw new Error(`[[error:too-many-posts-newbie, ${newbiepostdelay}, ${newbiepostdelaythreshold}]]`);
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        }
        else if (now - lasttime < meta_1.default.config.postDelay * 1000) {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            throw new Error(`[[error:too-many-posts, ${postdelay}]]`);
        }
    }
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    User.isReadyToPost = async function (uid, cid) {
        await isReady(uid, cid, 'lastposttime');
    };
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    User.isReadyToQueue = async function (uid, cid) {
        await isReady(uid, cid, 'lastqueuetime');
    };
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    User.onNewPostMade = async function (postData) {
        // For scheduled posts, use "action" time. It'll be updated in related cron job when post is published
        const lastposttime = postData.timestamp > Date.now() ? Date.now() : postData.timestamp;
        await Promise.all([
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            User.addPostIdToUser(postData),
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            User.setUserField(postData.uid, 'lastposttime', lastposttime),
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            User.updateLastOnlineTime(postData.uid),
        ]);
    };
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    User.addPostIdToUser = async function (postData) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await database_1.default.sortedSetsAdd([
            `uid:${postData.uid}:posts`,
            `cid:${postData.cid}:uid:${postData.uid}:pids`,
        ], postData.timestamp, postData.pid);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await User.updatePostCount(postData.uid);
    };
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    User.updatePostCount = async (uids) => {
        uids = Array.isArray(uids) ? uids : [uids];
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const exists = await User.exists(uids);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        uids = uids.filter((uid, index) => exists[index]);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (uids.length) {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            const counts = await database_1.default.sortedSetsCard(uids.map(uid => `uid:${uid}:posts`));
            await Promise.all([
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
                database_1.default.setObjectBulk(uids.map((uid, index) => ([`user:${uid}`, { postcount: counts[index] }]))),
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
                database_1.default.sortedSetAdd('users:postcount', counts, uids),
            ]);
        }
    };
    async function incrementUserFieldAndSetBy(uid, field, set, valueStr) {
        const value = parseInt(valueStr, 10);
        if (!value || !field || !(parseInt(uid, 10) > 0)) {
            return;
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const exists = await User.exists(uid);
        if (!exists) {
            return;
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const newValue = await User.incrementUserFieldBy(uid, field, value);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await database_1.default.sortedSetAdd(set, newValue, uid);
        return newValue;
    }
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    User.incrementUserPostCountBy = async function (uid, value) {
        return await incrementUserFieldAndSetBy(uid, 'postcount', 'users:postcount', value);
    };
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    User.incrementUserReputationBy = async function (uid, value) {
        return await incrementUserFieldAndSetBy(uid, 'reputation', 'users:reputation', value);
    };
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    User.incrementUserFlagsBy = async function (uid, value) {
        return await incrementUserFieldAndSetBy(uid, 'flags', 'users:flags', value);
    };
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    User.getPostIds = async function (uid, start, stop) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        return await database_1.default.getSortedSetRevRange(`uid:${uid}:posts`, start, stop);
    };
};
