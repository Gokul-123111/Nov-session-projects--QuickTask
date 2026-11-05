// Check whether the user has a valid Supabase session
async function protectDashboard() {
    try {
        const { data, error } = await supabaseClient.auth.getSession();

        if (error || !data.session) {
            window.location.replace("/login.html");
            return;
        }

        // Dashboard can be displayed for logged-in users
        document.documentElement.style.visibility = "visible";

    } catch (error) {
        console.error("Authentication check failed:", error);
        window.location.replace("/login.html");
    }
}

// Hide dashboard until authentication is checked
document.documentElement.style.visibility = "hidden";

protectDashboard();