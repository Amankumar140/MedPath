const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');
const env = require('./env');

// Prisma Client Singleton implementation for development environment
let prisma;

if (env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
    log: ['error', 'warn'],
  });
} else {
  // Prevent multiple instances of Prisma Client in dev due to hot reloading (e.g. Nodemon)
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      datasources: {
        db: {
          url: env.DATABASE_URL,
        },
      },
      log: ['query', 'info', 'warn', 'error'],
    });
  }
  prisma = global.prisma;
}

/**
 * Connect to the PostgreSQL database with an exponential backoff retry strategy.
 * Attempts up to 5 times by default.
 */
async function connectDb(retries = 5, delay = 1000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await prisma.$connect();
      logger.info('🔌 PostgreSQL database connected successfully via Prisma Client');
      return;
    } catch (error) {
      logger.error(`❌ Failed to connect to the database (attempt ${i}/${retries}): ${error.message}`);
      if (i === retries) {
        logger.error('❌ All database connection attempts failed. Database will show as DOWN in health check.');
      } else {
        logger.info(`🔄 Retrying database connection in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }
}

/**
 * Gracefully disconnect Prisma Client.
 */
async function disconnectDb() {
  try {
    await prisma.$disconnect();
    logger.info('🔌 Database connection closed gracefully');
  } catch (error) {
    logger.error('❌ Error during database disconnection:', error);
  }
}

/**
 * Helper to execute operations in a transaction with error handling.
 */
async function runTransaction(fn) {
  try {
    return await prisma.$transaction(fn);
  } catch (error) {
    logger.error('❌ Database transaction failed:', error);
    throw handlePrismaError(error);
  }
}

/**
 * Helper to paginate queries with standardized output.
 * @param {string} model Name of the Prisma model (e.g., 'hospital')
 * @param {object} queryArgs Standard Prisma query arguments (where, select, include, orderBy)
 * @param {object} options Pagination options (page, limit)
 */
async function paginate(model, queryArgs = {}, options = {}) {
  try {
    const page = Math.max(1, parseInt(options.page || 1, 10));
    const limit = Math.max(1, parseInt(options.limit || 10, 10));
    const skip = (page - 1) * limit;

    const [totalCount, items] = await prisma.$transaction([
      prisma[model].count({ where: queryArgs.where }),
      prisma[model].findMany({
        ...queryArgs,
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      items,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  } catch (error) {
    logger.error(`❌ Pagination failed on model ${model}:`, error);
    throw handlePrismaError(error);
  }
}

/**
 * Translate database-specific errors (Prisma) into descriptive application errors.
 */
function handlePrismaError(error) {
  if (error.code) {
    switch (error.code) {
      case 'P2002':
        return new Error(`Unique constraint failed on field(s): ${error.meta?.target || 'unknown'}`);
      case 'P2025':
        return new Error('Record not found');
      case 'P2003':
        return new Error(`Foreign key constraint failed on field: ${error.meta?.field_name || 'unknown'}`);
      default:
        return new Error(`Database error (${error.code}): ${error.message}`);
    }
  }
  return error;
}

module.exports = {
  prisma,
  connectDb,
  disconnectDb,
  runTransaction,
  paginate,
  handlePrismaError,
};
