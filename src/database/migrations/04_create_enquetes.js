exports.up = function(knex) {
    return knex.schema.createTable('enquetes', function(table) {
        table.increments('enqId').primary();
        table.string('enqNome').notNullable();        
    });
};
  
exports.down = function(knex) {
    return knex.schema.dropTable('enquetes');
};