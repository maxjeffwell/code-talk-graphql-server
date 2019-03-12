module.exports = {
	extends: ["airbnb-base", "plugin:prettier/recommended"],
	plugins: ["import", "graphql",],
	parser: "babel-eslint",
	rules: {
	    "graphql/template-strings": ['error', {
	    env: "apollo",
	    validators: 'all',
	    }],
	},
};
