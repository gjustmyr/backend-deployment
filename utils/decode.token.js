const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
	try {
		const authHeader = req.headers.authorization;

		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return res.status(401).json({ message: "Unauthorized: Missing token" });
		}

		const token = authHeader.split(" ")[1];
		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		// Attach decoded user to request for later use
		req.user = decoded; // e.g. { user_id: 5, role: 'ojt_head' }
		
		// Verify req.user was set correctly
		if (!req.user || !req.user.user_id) {
			console.error("Auth middleware: Failed to set req.user", { decoded });
			return res.status(401).json({ message: "Invalid token: Missing user data" });
		}

		// ✅ Very important: call next() to move to the next middleware/controller
		next();
	} catch (error) {
		console.error("Auth error:", error.message);
		return res.status(401).json({ message: "Invalid or expired token" });
	}
};

module.exports = authMiddleware;
