'use strict';

const dns = require('dns');

exports.handler = (event, context, callback) => {
    /**
     * This function will change the origin based on the X-DNS-ORIGIN header,
     * if it's set as a CustomHeader in the CloudFront Origin config
     *
     * It expects the value of this header to be a domain name of a regional S3
     * bucket endpoint (bucketname.s3.region.amazonaws.com), it will throw an
     * error if this header is set, but the domain resolves to something else,
     * or fails to resolve.
     *
     * This will make it possible to do an easy switch between regions, either
     * manual by editing the DNS record to point to another bucket, or automatic
     * by using Route53 features.
     */

     const request = event.Records[0].cf.request;

    if ('customHeaders' in request.origin.s3 && 'x-dns-origin' in request.origin.s3.customHeaders) {
        var hostname = request.origin.s3.customHeaders['x-dns-origin'][0].value;
        dns.resolveTxt(hostname, (err, records) => {
            // There was a request to resolve a hostname, but it failed: hard error
            if (err) { throw err }

            /**
             * records is a multidimentional array, so:
             * select a random element from the outermust array to get one record
             * each record should only contain one chunk (array is created by
             * assuming a record is CSV), so select the first element.
             */
            const domainName = records[Math.floor(Math.random()*records.length)][0];

            /**
             * domainName must use the format bucketname.s3.region.amazonaws.com.
             * Other formats are currently not supported, because we need to get
             * the region to create the SIGV4 signature used by the OAI. If you
             * don't use an OAI, you don't need the region, but it doesn't hurt
             * either.
             */
            var labels = domainName.split('.');
            if (labels.slice(-2).join('.') != 'amazonaws.com') {
                throw "invalid domainName format";
            }

            const region = labels.slice(-3)[0];

            // Set S3 origin to the values from the DNS record
            request.origin.s3.region = region;
            request.origin.s3.domainName = domainName;
            request.headers['host'] = [{ key: 'host', value: domainName }];

            callback(null, request);
        });
    } else {
        // do nothing
        callback(null, request);
    }
};