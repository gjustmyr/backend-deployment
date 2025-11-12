const getPathByRole = (role) => {
	console.log("Getting path for role:", role);
	switch (role) {
		case "alumni":
			return "/alumni";
		case "employer": // backend value, maps to "company-representative"
		case "company-representative":
			return "/company-representative";
		case "job-placement-head": // backend value, maps to "job-placement"
		case "job-placement":
			return "/job-placement";
		case "ojt-head":
			return "/ojt-head";
		case "ojt-coordinator":
			return "/ojt-coordinator";
		case "student-trainee":
			return "/student";
		case "superadmin": // backend value, maps to "super-admin"
		case "super-admin":
			return "/admin";
		case "supervisor": // backend value, maps to "training-supervisor"
		case "training-supervisor":
			return "/supervisor";
		default:
			return "/login";
	}
};
module.exports = { getPathByRole };
