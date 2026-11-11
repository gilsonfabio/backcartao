exports.up = function(knex) {
    return knex.schema.createTable('movies', function(table) {
        table.increments('movId').primary();
        table.string('movTitulo').notNullable();
        table.string('movSubTitulo').notNullable();
        table.string('movSinopse').notNullable();
        table.string('movDiretor').notNullable();
        table.interger('movAnoCriação').notNullable();
        table.interger('movAnoParticipacao').notNullable();
        table.string('movUrlPoster').notNullable();
        table.interger('movCategoria').notNullable();
        table.datetime('movDatProCriacao').notNullable();
        table.datetime('movDatProUpdate');
        table.datetime('movDatProDelecao');
        table.string('movStatus').notNullable();
    });
};
  
exports.down = function(knex) {
    return knex.schema.dropTable('movies');
};