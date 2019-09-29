module.exports = {
	extends: ["airbnb-base", "prettier"],
	plugins: ["import", "graphql", "prettier"],
	parser: "babel-eslint",
	rules: {
	    "graphql/template-strings": ['error', {
	    env: "apollo",
	    validators: 'all',
	    }],
		"prettier/prettier": ["error"]
	},
};
