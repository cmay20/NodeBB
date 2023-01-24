"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// const db = require('../database');
const db = require("../database");
const meta = require('../meta');
const privileges = require('../privileges');
module.exports = function (User) {
    User.isReadyToPost = function (uid, cid) {
        return __awaiter(this, void 0, void 0, function* () {
            yield isReady(uid, cid, 'lastposttime');
        });
    };
    User.isReadyToQueue = function (uid, cid) {
        return __awaiter(this, void 0, void 0, function* () {
            yield isReady(uid, cid, 'lastqueuetime');
        });
    };
    function isReady(uid, cid, field) {
        return __awaiter(this, void 0, void 0, function* () {
            if (parseInt(uid, 10) === 0) {
                return;
            }
            const [userData, isAdminOrMod] = yield Promise.all([
                User.getUserFields(uid, ['uid', 'mutedUntil', 'joindate', 'email', 'reputation'].concat([field])),
                privileges.categories.isAdminOrMod(cid, uid),
            ]);
            if (!userData.uid) {
                throw new Error('[[error:no-user]]');
            }
            if (isAdminOrMod) {
                return;
            }
            const now = Date.now();
            if (userData.mutedUntil > now) {
                let muteLeft = ((userData.mutedUntil - now) / (1000 * 60));
                if (muteLeft > 60) {
                    muteLeft = +(muteLeft / 60).toFixed(0);
                    throw new Error(`[[error:user-muted-for-hours, ${muteLeft}]]`);
                }
                else {
                    throw new Error(`[[error:user-muted-for-minutes, ${+muteLeft.toFixed(0)}]]`);
                }
            }
            if (now - userData.joindate < meta.config.initialPostDelay * 1000) {
                throw new Error(`[[error:user-too-new, ${meta.config.initialPostDelay}]]`);
            }
            const lasttime = userData[field] || 0;
            if (meta.config.newbiePostDelay > 0 &&
                meta.config.newbiePostDelayThreshold > userData.reputation &&
                now - lasttime < meta.config.newbiePostDelay * 1000) {
                throw new Error(`[[error:too-many-posts-newbie, ${meta.config.newbiePostDelay}, ${meta.config.newbiePostDelayThreshold}]]`);
            }
            else if (now - lasttime < meta.config.postDelay * 1000) {
                throw new Error(`[[error:too-many-posts, ${meta.config.postDelay}]]`);
            }
        });
    }
    User.onNewPostMade = function (postData) {
        return __awaiter(this, void 0, void 0, function* () {
            // For scheduled posts, use "action" time. It'll be updated in related cron job when post is published
            const lastposttime = postData.timestamp > Date.now() ? Date.now() : postData.timestamp;
            yield Promise.all([
                User.addPostIdToUser(postData),
                User.setUserField(postData.uid, 'lastposttime', lastposttime),
                User.updateLastOnlineTime(postData.uid),
            ]);
        });
    };
    User.addPostIdToUser = function (postData) {
        return __awaiter(this, void 0, void 0, function* () {
            yield db.sortedSetsAdd([
                `uid:${postData.uid}:posts`,
                `cid:${postData.cid}:uid:${postData.uid}:pids`,
            ], postData.timestamp, postData.pid);
            yield User.updatePostCount(postData.uid);
        });
    };
    User.updatePostCount = (uids) => __awaiter(this, void 0, void 0, function* () {
        uids = Array.isArray(uids) ? uids : [uids];
        const exists = yield User.exists(uids);
        uids = uids.filter((uid, index) => exists[index]);
        if (uids.length) {
            const counts = yield db.sortedSetsCard(uids.map(uid => `uid:${uid}:posts`));
            yield Promise.all([
                db.setObjectBulk(uids.map((uid, index) => ([`user:${uid}`, { postcount: counts[index] }]))),
                db.sortedSetAdd('users:postcount', counts, uids),
            ]);
        }
    });
    User.incrementUserPostCountBy = function (uid, value) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield incrementUserFieldAndSetBy(uid, 'postcount', 'users:postcount', value);
        });
    };
    User.incrementUserReputationBy = function (uid, value) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield incrementUserFieldAndSetBy(uid, 'reputation', 'users:reputation', value);
        });
    };
    User.incrementUserFlagsBy = function (uid, value) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield incrementUserFieldAndSetBy(uid, 'flags', 'users:flags', value);
        });
    };
    function incrementUserFieldAndSetBy(uid, field, set, value) {
        return __awaiter(this, void 0, void 0, function* () {
            value = parseInt(value, 10);
            if (!value || !field || !(parseInt(uid, 10) > 0)) {
                return;
            }
            const exists = yield User.exists(uid);
            if (!exists) {
                return;
            }
            const newValue = yield User.incrementUserFieldBy(uid, field, value);
            yield db.sortedSetAdd(set, newValue, uid);
            return newValue;
        });
    }
    User.getPostIds = function (uid, start, stop) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield db.getSortedSetRevRange(`uid:${uid}:posts`, start, stop);
        });
    };
};
