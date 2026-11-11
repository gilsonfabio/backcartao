exports.up = function(knex) {
    return knex.schema.createTable('votos', function(table) {
        table.increments('votUserId').primary();
        table.interger('votEnqId').notNullable();
        table.interger('votMovId').notNullable();         
    });
};
  
exports.down = function(knex) {
    return knex.schema.dropTable('votos');
};