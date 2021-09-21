const express = require("express");
const path = require("path");
const fs = require("fs");
const csv = require("csv-parser");

const app = express();
const port = 80;

const linearRegress = (values) => {
	// Algorithm interpreted from
	// https://www.freecodecamp.org/news/the-least-squares-regression-method-explained/

	/*
		values:
		[
			{x: 1, y: 1},
			{x: 2, y: 3},
			{x: 4, y: 6},
			{x: 10, y: 11},
			...
		]
	*/

	// Calculate sums of X and Y values
	const xSum = values.map((value) => value.x).reduce((prev, curr) => prev + Number.parseFloat(curr), 0);
	const ySum = values.map((value) => value.y).reduce((prev, curr) => prev + Number.parseFloat(curr), 0);

	// Calculate averages of X and Y values
	const xAvg = xSum / values.length;
	const yAvg = ySum / values.length;

	// https://www.freecodecamp.org/news/content/images/2020/08/image-50.png
	// "b" in the photo is actually "m" as we know it
	const numerator = values.reduce((sum, value) => sum + (value.x - xAvg) * (value.y - yAvg), 0);
	const denominator = values.reduce((sum, value) => sum + Math.pow(value.x - xAvg, 2), 0);

	// Calculate m and b
	const m = numerator / denominator;
	const b = yAvg - m * xAvg;

	// Return respective values
	return [m, b];
}

app.get("/", (req, res) => {
	// Navigate to main page
	res.sendFile("./index.html", { root: path.join(__dirname) });
});

app.get("/data", (req, res) => {
	// Parse data in data.csv and send bestFit, upperBound, and lowerBound lines, as well as plotted points
	let values = [];
	
	// Read the data from data.csv and parse it into a list
	fs.createReadStream("./data.csv")
		.pipe(csv(["x", "y"]))
		.on("data", (data) => values.push(data))
		.on("end", () => {
			// Calculate the slope (m) and intercept (b) from the dataset
			const [m, b] = linearRegress(values);

			// Best fit function
			const bestFit = (x) => {
				return m * x + b
			}

			// Calculates the deviation from the best fit line for every point
			// differences is a list of said deviations' absolute values
			// avgDifferences = sum of differences / # of differences
			const differences = values.map((point) => point.y - bestFit(point.x)).map((x) => Math.abs(x));
			const avgDifference = differences.reduce((sum, value) => sum + value, 0) / differences.length;

			// upper and lower bounds add or subtract the avgDifference from the original intercept
			const upperBound = (b + avgDifference).toFixed(3);
			const lowerBound = (b - avgDifference).toFixed(3);

			// Formatting the intercepts to tack onto the string
			// 12 -> +12
			// -12 -> -12
			const upperBoundIntercept = (upperBound >= 0) ? `+${upperBound}` : `${upperBound}`;
			const lowerBoundIntercept = (lowerBound >= 0) ? `+${lowerBound}` : `${lowerBound}`;
			const bestFitIntercept = (b.toFixed(3) >= 0 ? "+" + b.toFixed(3) : b.toFixed(3));

			// Creates the equations to send to Desmos
			// Sends the data to Desmos with 200 (OK, everything went fine)
			res.status(200).send({
				bestFit: `y=${m.toFixed(3)}x${bestFitIntercept}`,
				upperBound: `y=${m.toFixed(3)}x${upperBoundIntercept}`,
				lowerBound: `y=${m.toFixed(3)}x${lowerBoundIntercept}`,
				points: values
			});
			
		});
});

// Listens on port 443 (HTTP)
app.listen(port, () => {
	console.log("Navigate to http://localhost in your web browser to parse your data.");
	console.log("Ensure it is in the project folder and named \"data.csv\"!");
});