/**
 * Script to delete all internships that have no associated skills
 * 
 * Usage: node server/scripts/delete-internships-without-skills.js [--dry-run]
 * 
 * --dry-run: Only preview what will be deleted, don't actually delete
 */

require("dotenv").config();
const db = require("../models");
const { Internship, InternshipSkill } = db;

async function deleteInternshipsWithoutSkills(dryRun = true) {
	try {
		console.log("=".repeat(60));
		console.log(dryRun ? "DRY RUN MODE - No data will be deleted" : "DELETE MODE - Data will be permanently deleted!");
		console.log("=".repeat(60));
		console.log();

		// Find all internships
		const allInternships = await Internship.findAll({
			attributes: ["internship_id", "title", "employer_id", "status", "approval_status"],
			order: [["createdAt", "DESC"]],
		});

		// Find internships with skills
		const internshipsWithSkills = await InternshipSkill.findAll({
			attributes: ["internship_id"],
			group: ["internship_id"],
		});

		const internshipIdsWithSkills = new Set(
			internshipsWithSkills.map((is) => is.internship_id)
		);

		// Find internships without skills
		const internshipsWithoutSkills = allInternships.filter(
			(internship) => !internshipIdsWithSkills.has(internship.internship_id)
		);

		console.log(`Total internships: ${allInternships.length}`);
		console.log(`Internships with skills: ${internshipIdsWithSkills.size}`);
		console.log(`Internships WITHOUT skills: ${internshipsWithoutSkills.length}`);
		console.log();

		if (internshipsWithoutSkills.length === 0) {
			console.log("✅ No internships found without skills. Nothing to delete.");
			process.exit(0);
		}

		console.log("Internships that will be deleted:");
		console.log("-".repeat(60));
		internshipsWithoutSkills.forEach((internship, index) => {
			console.log(
				`${index + 1}. ID: ${internship.internship_id} | Title: ${internship.title} | Status: ${internship.status} | Approval: ${internship.approval_status}`
			);
		});
		console.log("-".repeat(60));
		console.log();

		if (dryRun) {
			console.log("🔍 DRY RUN MODE - No data was deleted.");
			console.log("To actually delete, run: node server/scripts/delete-internships-without-skills.js");
		} else {
			// Confirm deletion
			const readline = require("readline");
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout,
			});

			rl.question(
				`⚠️  Are you sure you want to delete ${internshipsWithoutSkills.length} internship(s)? (yes/no): `,
				async (answer) => {
					if (answer.toLowerCase() === "yes") {
						const internshipIds = internshipsWithoutSkills.map((i) => i.internship_id);

						// Delete the internships
						const deletedCount = await Internship.destroy({
							where: {
								internship_id: internshipIds,
							},
						});

						console.log(`✅ Successfully deleted ${deletedCount} internship(s) without skills.`);
					} else {
						console.log("❌ Deletion cancelled.");
					}

					rl.close();
					await db.sequelize.close();
					process.exit(0);
				}
			);
		}
	} catch (error) {
		console.error("❌ Error:", error.message);
		console.error(error);
		await db.sequelize.close();
		process.exit(1);
	}
}

// Check command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run") || !args.includes("--execute");

// Run the script
deleteInternshipsWithoutSkills(dryRun).then(() => {
	if (dryRun) {
		db.sequelize.close();
		process.exit(0);
	}
});

