const { orderBy } = require('../database/connection');
const connection = require('../database/connection');

module.exports = {   
    async index (request, response) {
        let status = 'A';
        const secretarias = await connection('secretarias')
        .where('secStatus', status)
        .orderBy('secDescricao')
        .select('*');
    
        return response.json(secretarias);
    },    

};