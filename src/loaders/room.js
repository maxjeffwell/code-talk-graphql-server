// import { Op } from 'sequelize';
//
// export const batchRooms = async (keys, models) => {
//   const rooms = await models.Room.findAll({
//     where: {
//       id: {
//         [Op.in]: keys,
//       },
//     },
//   });
//
//   return keys.map(key => rooms.find(room => room.id === key));
// };
