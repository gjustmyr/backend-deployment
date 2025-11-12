const tf = require("@tensorflow/tfjs");

const sanitizeText = (value) => {
	if (!value) return "";
	return String(value)
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
};

const tokenize = (text) => {
	if (!text) return [];
	return sanitizeText(text)
		.split(" ")
		.filter(Boolean);
};

const buildVocabulary = (documents) => {
	const vocabSet = new Set();
	documents.forEach((tokens) => {
		tokens.forEach((token) => vocabSet.add(token));
	});
	const vocabulary = Array.from(vocabSet);
	const index = vocabulary.reduce((acc, token, idx) => {
		acc[token] = idx;
		return acc;
	}, {});
	return { vocabulary, index };
};

const createVector = (tokens, vocabIndex) => {
	const vector = new Float32Array(Object.keys(vocabIndex).length);
	tokens.forEach((token) => {
		const position = vocabIndex[token];
		if (position !== undefined) {
			vector[position] += 1;
		}
	});
	return vector;
};

const computeCosineSimilarity = (studentTokens, jobTokens) => {
	if (!studentTokens.length || !jobTokens.length) {
		return 0;
	}

	const { index } = buildVocabulary([studentTokens, jobTokens]);

	const studentVector = createVector(studentTokens, index);
	const jobVector = createVector(jobTokens, index);

	const studentTensor = tf.tensor1d(studentVector);
	const jobTensor = tf.tensor1d(jobVector);
	const studentNorm = tf.norm(studentTensor).dataSync()[0];
	const jobNorm = tf.norm(jobTensor).dataSync()[0];

	let score = 0;
	if (studentNorm > 0 && jobNorm > 0) {
		const product = studentTensor.mul(jobTensor);
		const dotTensor = tf.sum(product);
		const dot = dotTensor.dataSync()[0];
		product.dispose();
		dotTensor.dispose();
		score = dot / (studentNorm * jobNorm);
	}

	studentTensor.dispose();
	jobTensor.dispose();

	return Number.isFinite(score) ? score : 0;
};

const buildStudentTokens = ({
	about,
	skills = [],
	department,
	program,
	major,
}) => {
	const parts = [about, department, program, major, skills.join(" ")].filter(Boolean);
	return tokenize(parts.join(" "));
};

const buildJobTokens = ({ title, description, skills = [], company, industry }) => {
	const parts = [title, description, company, industry, skills.join(" ")].filter(Boolean);
	return tokenize(parts.join(" "));
};

module.exports = {
	tokenize,
	buildStudentTokens,
	buildJobTokens,
	computeCosineSimilarity,
	sanitizeText,
};
