import { combineResolvers } from 'graphql-resolvers';
import { createWriteStream } from 'fs';

import { isAuthenticated  } from './authorization';

const storeUpload = ({ filename, stream }) =>
	new Promise((resolve, reject) =>
		stream
			.pipe(createWriteStream(filename))
			.on('finish', () => resolve())
			.on('error', reject)
	);

export default {
	Query: {
		uploads: () => {
			// Return the record of files uploaded from your DB or API or filesystem.
		},
	},

	Mutation: {
		uploadFile: combineResolvers(
			isAuthenticated,
			async (parent, { file }) => {
				const { filename, stream }  = await file;
				await storeUpload({ filename, stream });
				return true;
			},
		),
	},
	Upload: {
		user: async (upload, args, {loaders}) => {
			return await loaders.user.load(upload.userId);
		},
	},
};
