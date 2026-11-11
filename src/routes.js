
const express = require('express');
const routes = express.Router();

const SecretController = require('./controllers/SecretController');
const ComprasController = require('./controllers/ComprasController');
const ConveniosController = require('./controllers/ConveniosController');

routes.get('/', (request, response) => {
    response.json({
        message: 'Bem-vindo ao servidor Sindicaldas! Versão: 2.0.1',
    });
});

routes.get('/secretarias', SecretController.index);

// RELATÓRIO DE COMPRAS
routes.get('/relatorioCompras/dashboard', ComprasController.dashboardCompras);
routes.get('/relatorioCompras', ComprasController.relatorioCompras);
routes.get('/relComprasDivergentes', ComprasController.relatorioComprasDivergentes);
routes.get('/relatorioCompras/dashboard-liquido', ComprasController.dashboardComprasLiquidas);

routes.get('/convenios', ConveniosController.listar);



module.exports = routes;
