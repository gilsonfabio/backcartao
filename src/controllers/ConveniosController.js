const connection = require('../database/connection');

module.exports = {  
    async listar(request, response) {
        try {
            const convenios = await connection('convenios')
            .select(
                'id_Convenio',
                'con_Fantasia'
            )
            .orderBy('con_Fantasia', 'asc');

            return response.status(200).json({
            success: true,
            convenios
            });

        } catch (error) {
            console.error('Erro ao listar convênios:', error);

            return response.status(500).json({
            success: false,
            message: 'Erro ao consultar os convênios.',
            error: error.message
            });
        }
    },
}
