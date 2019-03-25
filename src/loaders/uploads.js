import { Op } from 'sequelize';

export const batchUploads = async (keys, models) => {
	const uploads = await models.Uploads.findAll({
		where: {
			id: {
				[Op.in]: keys,
			},
		},
	});

	return keys.map(key => uploads.find(uploads => uploads.id === key));
};