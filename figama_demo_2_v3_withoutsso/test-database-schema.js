// Test script to check actual database schema vs expected schema
const mysql = require('mysql2/promise');

async function testDatabaseSchema() {
  try {
    const connection = await mysql.createConnection({
      host: 'aamsql-apm1009705-00dev01.c3q2fsxl5yla.us-east-2.rds.amazonaws.com',
      port: 3306,
      user: 'SRC_INTHELP_SLVR_WRITE', 
      password: 'S7vcCw96uY$o0f%W',
      database: 'aamsqlapm1009705dev',
      ssl: { rejectUnauthorized: false }
    });
    
    console.log('✅ Connected to database');
    
    // Check if wl_conversations table exists and what columns it has
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `, ['aamsqlapm1009705dev', 'wl_conversations']);
    
    console.log('\n🔍 Current wl_conversations table structure:');
    console.log('==========================================');
    
    const columnNames = columns.map(col => col.COLUMN_NAME);
    console.log('📋 Available columns:', columnNames.join(', '));
    
    // Check specifically for updated_at and last_message_at
    const hasUpdatedAt = columnNames.includes('updated_at');
    const hasLastMessageAt = columnNames.includes('last_message_at');
    
    console.log('\n🎯 Schema Analysis:');
    console.log('- updated_at column exists:', hasUpdatedAt ? '✅' : '❌');
    console.log('- last_message_at column exists:', hasLastMessageAt ? '✅' : '❌');
    
    if (!hasUpdatedAt) {
      console.log('\n💡 Issue Found: missing updated_at column!');
      console.log('   This explains the "Unknown column \'updated_at\'" errors');
    }
    
    if (!hasLastMessageAt) {
      console.log('\n💡 Issue Found: missing last_message_at column!');
      console.log('   Backend expects this column for conversation ordering');
    }
    
    // Show full column details
    console.log('\n📄 Full column details:');
    columns.forEach(col => {
      console.log(`   ${col.COLUMN_NAME}: ${col.DATA_TYPE} (nullable: ${col.IS_NULLABLE}, default: ${col.COLUMN_DEFAULT})`);
    });
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    
    // Check if it's specifically the column error
    if (error.message.includes('Unknown column')) {
      console.log('\n🔍 This confirms the schema mismatch issue!');
    }
  }
}

testDatabaseSchema();