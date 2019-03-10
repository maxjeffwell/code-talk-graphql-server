module.exports = {
	"extends": "airbnb-base",
	"plugins": [
		"import",
		"graphql"
	],
	parser: "babel-eslint",
	rules: {
	    "graphql/template-strings": ['error', {
	    env: "apollo",

            // Import default settings for your GraphQL client. Supported values:
            // 'apollo', 'relay', 'lokka', 'fraql', 'literal'i,e, env: 'literal'
          // no need to specify schema here, it will be automatically determined using .graphqlconfig
        }]
	}
};
