const connectButton = document.getElementById("connect-strava");

connectButton.addEventListener("click", () => {

    const clientId = "268391";

    const redirectUri = "http://127.0.0.1:44983/strava-callback.html";

    const scope = "read,activity:read_all";

    const url =
        `https://www.strava.com/oauth/authorize?` +
        `client_id=${clientId}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&approval_prompt=auto` +
        `&scope=${scope}`;

    window.location.href = url;

});