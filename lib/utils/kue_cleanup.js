var kue = require('kue');

/*
 * Log and remove
 */
function jobRemove(id, reason) {
  kue.Job.get( id, function ( err, job ) {
    if ( err ) return;
    job.remove( function ( err ) {
      if ( err ) throw err;
      log.info(`Job ${job.id} removed : changeset ${job.data.id} [${reason}]`);
    } );
  } );
}

module.exports = function (queue) {
  [
    [ 'failed', 30 * 24 * 60 * 60 * 1000 ], // 30 days
    [ 'active', 1 * 24 * 60 * 60 * 1000 ], // 1 day
    [ 'complete', 30 * 24 * 60 * 60 * 1000 ] // 30 days
  ].forEach(function (item) {
    var job_list = item[0];
    var max_age = item[1];

    queue[job_list](function(err, ids) {
      if (!ids) return;

      ids.forEach(function (id, index) {
        kue.Job.get(id, function (err, job) {
          if (err || !job) return;

          var created_at = new Date(parseInt(job.created_at));
          var age = parseInt(new Date().getTime() - created_at);

          if (age > max_age) {
            jobRemove(job, job_list);
          }
        });
      });
    });
  });
}
