const {initializeApp} = require("firebase-admin/app");
const {getAuth} = require("firebase-admin/auth");
const {getFirestore} = require("firebase-admin/firestore");
const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");

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
 * Preserves valid values including zero, otherwise returns null.
 * @param {*} value Value to check.
 * @return {*} Original value or null.
 */
function valueOrNull(value) {
  return value === undefined || value === null ? null : value;
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

                  distanceMeters: activity.distance,
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

