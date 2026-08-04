const {initializeApp} = require("firebase-admin/app");
const {getAuth} = require("firebase-admin/auth");
const {getFirestore} = require("firebase-admin/firestore");
const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const OpenAI = require("openai");

initializeApp();
const db = getFirestore();

setGlobalOptions({maxInstances: 10});

/**
 * Returns a valid Strava access token.
 * Refreshes and stores the token when needed.
 *
 * @param {string} uid Firebase user ID.
 * @param {Object} stravaData Stored Strava token data.
 * @return {Promise<string>} Valid Strava access token.
 */
async function getValidStravaAccessToken(
    uid,
    stravaData,
) {
  const currentTimeSeconds =
      Math.floor(Date.now() / 1000);

  const refreshBufferSeconds = 300;

  const tokenStillValid =
      stravaData.expiresAt &&
      stravaData.expiresAt >
      currentTimeSeconds + refreshBufferSeconds;

  if (tokenStillValid) {
    console.log(
        "Existing Strava access token is valid.",
    );

    return stravaData.accessToken;
  }

  console.log(
      "Strava access token needs refreshing.",
  );

  if (!stravaData.refreshToken) {
    throw new Error(
        "No Strava refresh token is stored.",
    );
  }

  const refreshResponse = await fetch(
      "https://www.strava.com/oauth/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: "268391",
          client_secret:
              process.env.STRAVA_CLIENT_SECRET,
          grant_type: "refresh_token",
          refresh_token:
              stravaData.refreshToken,
        }),
      },
  );

  const refreshData =
      await refreshResponse.json();

  if (!refreshResponse.ok) {
    console.error(
        "Strava token refresh failed:",
        refreshData,
    );

    throw new Error(
        "Unable to refresh Strava access token.",
    );
  }

  await db
      .collection("users")
      .doc(uid)
      .collection("private")
      .doc("strava")
      .set(
          {
            accessToken:
                refreshData.access_token,
            refreshToken:
                refreshData.refresh_token,
            expiresAt:
                refreshData.expires_at,
          },
          {
            merge: true,
          },
      );

  console.log(
      "Strava access token refreshed.",
  );

  return refreshData.access_token;
}

/**
 * Saves calculated statistics to Firestore.
 *
 * @param {string} uid
 * @param {Object} statistics
 * @return {Promise<void>}
 */
async function saveStatistics(uid, statistics) {
  await db
      .collection("users")
      .doc(uid)
      .collection("statistics")
      .doc("summary")
      .set(statistics, {
        merge: true,
      });
}

/**
 * Saves equipment information to Firestore.
 *
 * @param {string} uid
 * @param {Object} equipment
 * @return {Promise<void>}
 */
async function saveEquipment(uid, equipment) {
  await db
      .collection("users")
      .doc(uid)
      .collection("equipment")
      .doc("summary")
      .set(equipment, {
        merge: true,
      });
}

/**
 * Preserves valid values including zero, otherwise returns null.
 * @param {*} value Value to check.
 * @return {*} Original value or null.
 */
function valueOrNull(value) {
  return value === undefined || value === null ? null : value;
}

/**
 * Calculates summary statistics from imported Strava activities.
 *
 * @param {Array} activities
 * @return {Object}
 */
function calculateStatistics(activities) {
  const METERS_TO_MILES = 0.000621371;

  const runningActivities = activities.filter((activity) =>
    [
      "Run",
      "TrailRun",
      "VirtualRun",
    ].includes(activity.sportType),
  );

  const stats = {
    activityCount: runningActivities.length,
    lifetimeMiles: 0,
    totalTimeRunningSeconds: 0,
    lastCompletedWeekMileage: 0,
    highestWeeklyMileage: 0,
    averageRunsPerWeek8Weeks: 0,
    averageWeeklyMileage8Weeks: 0,
    longestRun: 0,
    maxHeartRate: 0,
  };

  const weeklyMileage = {};

  let runsLast8Weeks = 0;
  let milesLast8Weeks = 0;

  const now = new Date();

  // Beginning of this week (Monday)
  const thisWeekStart = new Date(now);
  thisWeekStart.setHours(0, 0, 0, 0);

  const day = thisWeekStart.getDay();
  const diff = day === 0 ? 6 : day - 1;
  thisWeekStart.setDate(thisWeekStart.getDate() - diff);

  // Beginning of last week
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  // End of last week
  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setMilliseconds(-1);

  const eightWeeksAgo = new Date(lastWeekStart);
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - (7 * 7));

  runningActivities.forEach((activity) => {
    const miles =
      (activity.distanceMeters || 0) * METERS_TO_MILES;

    stats.lifetimeMiles += miles;

    stats.totalTimeRunningSeconds +=
      activity.movingTimeSeconds || 0;

    if (miles > stats.longestRun) {
      stats.longestRun = miles;
    }

    if (
      activity.maxHeartRate &&
      activity.maxHeartRate > stats.maxHeartRate
    ) {
      stats.maxHeartRate =
        activity.maxHeartRate;
    }

    const activityDate =
      new Date(activity.startDate);

    if (
      activityDate >= eightWeeksAgo &&
        activityDate <= lastWeekEnd
    ) {
      runsLast8Weeks++;
      milesLast8Weeks += miles;
    }

    if (
      activityDate >= lastWeekStart &&
      activityDate <= lastWeekEnd
    ) {
      stats.lastCompletedWeekMileage += miles;
    }

    const weekKey =
      activityDate.getFullYear() +
      "-" +
      Math.ceil(
          (
            (activityDate -
              new Date(activityDate.getFullYear(), 0, 1)
            ) /
            86400000 +
            1
          ) / 7,
      );

    weeklyMileage[weekKey] =
      (weeklyMileage[weekKey] || 0) + miles;
  });

  stats.highestWeeklyMileage =
    Math.max(
        0,
        ...Object.values(weeklyMileage),
    );

  stats.averageRunsPerWeek8Weeks =
    Number((runsLast8Weeks / 8).toFixed(1));

  stats.averageWeeklyMileage8Weeks =
    Number((milesLast8Weeks / 8).toFixed(1));

  stats.lifetimeMiles =
    Number(stats.lifetimeMiles.toFixed(1));

  stats.lastCompletedWeekMileage =
    Number(stats.lastCompletedWeekMileage.toFixed(1));

  stats.highestWeeklyMileage =
    Number(stats.highestWeeklyMileage.toFixed(1));

  stats.longestRun =
    Number(stats.longestRun.toFixed(1));

  return stats;
}

/**
 * Finds the user's most recently used watch.
 *
 * @param {Array} activities
 * @return {string}
 */
function getWatch(activities) {
  const runningActivities = activities.filter((activity) =>
    activity.sportType === "Run" ||
    activity.sportType === "TrailRun" ||
    activity.sportType === "VirtualRun",
  );

  runningActivities.sort(
      (a, b) => new Date(b.startDate) - new Date(a.startDate),
  );

  for (const activity of runningActivities) {
    if (
      activity.deviceName &&
      activity.deviceName.trim() !== ""
    ) {
      return activity.deviceName;
    }
  }

  return "";
}

/**
 * Downloads gear information from Strava.
 *
 * @param {string} accessToken
 * @param {Array} activities
 * @return {Promise<Object>}
 */
async function syncGear(accessToken, activities) {
  const gearIds = new Set();

  activities.forEach((activity) => {
    if (activity.gearId) {
      gearIds.add(activity.gearId);
    }
  });

  const shoes = {};

  for (const gearId of gearIds) {
    const response = await fetch(
        `https://www.strava.com/api/v3/gear/${gearId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
    );

    if (!response.ok) {
      continue;
    }

    const gearData = await response.json();

    shoes[gearData.id] = {
      id: gearData.id,
      name: gearData.name || "",
      brand: gearData.brand_name || "",
      model: gearData.model_name || "",
      distanceMeters: gearData.distance || 0,
    };
  }

  return {
    watch: "",
    shoes,
  };
}

exports.stravaCallback = onRequest(
    {
      secrets: ["STRAVA_CLIENT_SECRET"],
      cors: true,
    },
    async (request, response) => {
      try {
        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return response.status(401).json({
            error: "User is not authenticated.",
          });
        }

        const idToken = authHeader.split("Bearer ")[1];

        const decodedToken = await getAuth().verifyIdToken(idToken);

        const uid = decodedToken.uid;

        console.log("Authenticated Firebase user:", uid);
        const code = request.body.code;

        if (!code) {
          return response.status(400).json({
            error: "No authorization code received.",
          });
        }

        const tokenResponse = await fetch(
            "https://www.strava.com/oauth/token",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                client_id: "268391",
                client_secret: process.env.STRAVA_CLIENT_SECRET,
                code: code,
                grant_type: "authorization_code",
              }),
            },
        );

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
          return response.status(tokenResponse.status).json({
            error: "Strava token exchange failed.",
            details: tokenData,
          });
        }

        await db.collection("users").doc(uid).set(
            {
              stravaConnected: true,
              stravaAthleteId: tokenData.athlete.id,
              stravaConnectedAt: new Date(),
            },
            {
              merge: true,
            },
        );

        await db
            .collection("users")
            .doc(uid)
            .collection("private")
            .doc("strava")
            .set({
              accessToken: tokenData.access_token,
              refreshToken: tokenData.refresh_token,
              expiresAt: tokenData.expires_at,
            });

        return response.status(200).json({
          success: true,
          athlete: tokenData.athlete,
          accessTokenReceived: Boolean(tokenData.access_token),
          refreshTokenReceived: Boolean(tokenData.refresh_token),
          expiresAt: tokenData.expires_at,
        });
      } catch (error) {
        console.error("Strava callback error:", error);

        return response.status(500).json({
          error: "Internal server error.",
        });
      }
    },
);

exports.getStravaActivities = onRequest(
    {
      cors: true,
      secrets: ["STRAVA_CLIENT_SECRET"],
    },
    async (request, response) => {
      try {
        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return response.status(401).json({
            error: "User is not authenticated.",
          });
        }

        const idToken = authHeader.split("Bearer ")[1];

        const decodedToken = await getAuth().verifyIdToken(idToken);

        const uid = decodedToken.uid;

        const stravaDoc = await db
            .collection("users")
            .doc(uid)
            .collection("private")
            .doc("strava")
            .get();

        if (!stravaDoc.exists) {
          return response.status(404).json({
            error: "Strava is not connected.",
          });
        }

        const stravaData = stravaDoc.data();
        const syncCooldownSeconds = 120;

        if (stravaData.lastSyncedAt) {
          const lastSyncSeconds =
      Math.floor(
          stravaData.lastSyncedAt
              .toDate()
              .getTime() / 1000,
      );

          const currentTimeSeconds =
      Math.floor(Date.now() / 1000);

          const secondsSinceLastSync =
      currentTimeSeconds - lastSyncSeconds;

          if (
            secondsSinceLastSync <
    syncCooldownSeconds
          ) {
            return response.status(200).json({
              success: true,
              skipped: true,
              reason: "cooldown",
              secondsUntilNextSync:
          syncCooldownSeconds -
          secondsSinceLastSync,
              activityCount: 0,
              activitiesImported: 0,
            });
          }
        }
        const accessToken =
          await getValidStravaAccessToken(uid, stravaData);
        const activities = [];
        const lastSyncedAt =
          stravaData.lastSyncedAt || null;

        let afterTimestamp = null;

        if (lastSyncedAt) {
          afterTimestamp =
            Math.floor(lastSyncedAt.toDate().getTime() / 1000) - 300;
        }
        const perPage = 100;
        const maxPages = 10;
        let page = 1;
        let keepFetching = true;

        while (keepFetching) {
          let activitiesUrl =
              `https://www.strava.com/api/v3/athlete/activities` +
              `?per_page=${perPage}&page=${page}`;

          if (afterTimestamp) {
            activitiesUrl +=
              `&after=${afterTimestamp}`;
          }

          const detail = await detailResponse.json();

          console.log(detail);

          const activitiesResponse = await fetch(
              activitiesUrl,
              {
                headers: {
                  "Authorization": `Bearer ${accessToken}`,
                },
              },
          );

          const pageActivities = await activitiesResponse.json();

          if (!activitiesResponse.ok) {
            return response.status(activitiesResponse.status).json({
              error: "Failed to get Strava activities.",
              details: pageActivities,
            });
          }

          activities.push(...pageActivities);

          if (pageActivities.length < perPage || page >= maxPages) {
            keepFetching = false;
          } else {
            page++;
          }
        }

        const batchSize = 400;

        for (let i = 0; i < activities.length; i += batchSize) {
          const batch = db.batch();
          const activityChunk = activities.slice(i, i + batchSize);

          activityChunk.forEach((activity) => {
            const activityRef = db
                .collection("users")
                .doc(uid)
                .collection("activities")
                .doc(String(activity.id));

            batch.set(
                activityRef,
                {
                  stravaActivityId: activity.id,
                  name: activity.name,
                  sportType: activity.sport_type,
                  workoutType: valueOrNull(activity.workout_type),

                  startDate: activity.start_date,
                  startDateLocal: activity.start_date_local,
                  timezone: activity.timezone,

                  distanceMeters: activity.distance || 0,
                  movingTimeSeconds: activity.moving_time,
                  elapsedTimeSeconds: activity.elapsed_time,

                  totalElevationGainMeters: activity.total_elevation_gain,
                  elevationHighMeters: valueOrNull(activity.elev_high),
                  elevationLowMeters: valueOrNull(activity.elev_low),

                  averageSpeedMetersPerSecond:
                    valueOrNull(activity.average_speed),
                  maxSpeedMetersPerSecond: valueOrNull(activity.max_speed),

                  hasHeartRate: activity.has_heartrate || false,
                  averageHeartRate: valueOrNull(activity.average_heartrate),
                  maxHeartRate: valueOrNull(activity.max_heartrate),

                  averageCadence: valueOrNull(activity.average_cadence),
                  averageTemperatureCelsius: valueOrNull(activity.average_temp),
                  sufferScore: valueOrNull(activity.suffer_score),

                  deviceName: valueOrNull(activity.device_name),

                  manual: activity.manual || false,
                  trainer: activity.trainer || false,
                  commute: activity.commute || false,

                  achievementCount: activity.achievement_count || 0,
                  prCount: activity.pr_count || 0,

                  gearId: valueOrNull(activity.gear_id),

                  source: "strava",
                  importedAt: new Date(),
                },
                {
                  merge: true,
                },
            );
          });

          await batch.commit();
        }

        const allActivitiesSnapshot = await db
            .collection("users")
            .doc(uid)
            .collection("activities")
            .get();

        const allActivities = allActivitiesSnapshot.docs.map((doc) =>
          doc.data());

        const statistics = calculateStatistics(allActivities);

        await saveStatistics(uid, statistics);

        const equipment =
            await syncGear(accessToken, allActivities);

        equipment.watch = getWatch(allActivities);

        await saveEquipment(uid, equipment);

        await db
            .collection("users")
            .doc(uid)
            .collection("private")
            .doc("strava")
            .set(
                {
                  lastSyncedAt: new Date(),
                },
                {
                  merge: true,
                },
            );

        return response.status(200).json({
          success: true,
          activityCount: activities.length,
          activitiesImported: activities.length,
        });
      } catch (error) {
        console.error("Get Strava activities error:", error);

        return response.status(500).json({
          error: "Internal server error.",
        });
      }
    },
);

exports.testAI = onRequest(
    {
      cors: true,
      secrets: ["OPENAI_API_KEY"],
    },
    async (request, response) => {
      try {
        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return response.status(401).json({
            error: "User is not authenticated.",
          });
        }

        const idToken = authHeader.split("Bearer ")[1];
        await getAuth().verifyIdToken(idToken);

        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

        const completion = await openai.responses.create({
          model: "gpt-5.5",
          input: "Say hello to MyRunningIQ in one sentence.",
        });

        return response.status(200).json({
          success: true,
          response: completion.output_text,
        });
      } catch (error) {
        console.error(error);

        return response.status(500).json({
          error: error.message,
        });
      }
    },
);


