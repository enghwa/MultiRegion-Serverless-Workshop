# S3 Replication and CloudFront with Multi-Region S3 Origins

During the workshop, we focused on the application replication using API Gateway, Lambda and DynamoDB, but do not address replication of the website UI layer itself to a second region.

This module provides how you achieve the Web UI layer replication using **S3 Cross Region Replication** and **CloudFront Origin Failover**. It is optional module that you can try if you have enough time in the workshop or explore later. 

![Architecture diagram](images/architecture-2.png)

As you've seen, still this application is not fully active-active multi-region solution as the AWS Cognito exists only in the primary region (Ireland). We will provide additional suggestion for the full stack after re:invent. 

### S3 Cross-Region Replication (CRR)

We can replicate objects in S3 bucket to other regions for regionally distributed computing, minimize latency for users in different geographic locations, or maintain copies of objects under different ownership. When using Amazon S3 to host static websites, a good way to serve data from regions is to use [Cross-Region Replication]](https://docs.aws.amazon.com/AmazonS3/latest/dev/crr.html).

Cross-region replication (CRR) enables automatic, asynchronous copying of objects across buckets in different AWS Regions. To set up CRR when the source and destination buckets are owned by the same AWS account with the AWS CLI, you create source and destination buckets, enable versioning on the buckets, create an IAM role that gives Amazon S3 permission to replicate objects, and add the replication configuration to the source bucket. 

1.Enable versioning on your source bucket in Ireland region: 

    aws s3api put-bucket-versioning \
	--bucket <source bucket name. ex) ticket-service-ui-websitebucket-firstname-lastname> \
	--versioning-configuration Status=Enabled \
	
2.Create a destination bucket and enable versioning on it. 

    aws s3api create-bucket \
	--bucket <destination bucket name. ex) ticket-service-ui-websitebucket-singapore-firstname-lastname> \
	--region ap-southeast-1 \
	--create-bucket-configuration LocationConstraint=ap-southeast-1 \

    aws s3api put-bucket-versioning \
	--bucket <destination bucket name. ex) ticket-service-ui-websitebucket-singapore-firstname-lastname> \
	--versioning-configuration Status=Enabled \

3.Create an IAM role. You specify this role in the replication configuration that you add to the source bucket later. Amazon S3 assumes this role to replicate objects on your behalf. You create an IAM role and attach a permissions policy to the role.

Copy the following trust policy and save it to a to a file called S3-role-trust-policy.json in the current directory on your Cloud9 environment. This policy grants Amazon S3 service principal permissions to assume the role. 

	{
		"Version":"2012-10-17",
		"Statement":[
			{
    	    	"Effect":"Allow",
    	     	"Principal":{
    	        	"Service":"s3.amazonaws.com"
       	  		},
     	    	"Action":"sts:AssumeRole"
    	  }
		]
	}

Run the following command to create a role:

    aws iam create-role \
	--role-name crrRole \
	--assume-role-policy-document file://s3-role-trust-policy.json  \

Attach a permissions policy to the role. Copy the following permissions policy and save it to a file named S3-role-permissions-policy.json in the current directory on your Cloud9 environment. This policy grants permissions for various Amazon S3 bucket and object actions. 

	{
		"Version":"2012-10-17",
		"Statement":[
      		{
         		"Effect":"Allow",
         		"Action":[
            		"s3:GetObjectVersionForReplication",
            		"s3:GetObjectVersionAcl"
         		],
         		"Resource":[
            		"arn:aws:s3:::source-bucket/*"
         		]
      		},
      		{
				"Effect":"Allow",
         		"Action":[
            		"s3:ListBucket",
            		"s3:GetReplicationConfiguration"
         		],
         		"Resource":[
            		"arn:aws:s3:::source-bucket"
         		]
      		},
      		{
         		"Effect":"Allow",
         		"Action":[
            		"s3:ReplicateObject",
            		"s3:ReplicateDelete",
            		"s3:ReplicateTags",
            		"s3:GetObjectVersionTagging"
         		],
         		"Resource":"arn:aws:s3:::destination-bucket/*"
      		}
      	]
    }

Run the following command to create a policy and attach it to the role: 

    aws iam put-role-policy \
		--role-name crrRole \
		--policy-document file://s3-role-permissions-policy.json \
		--policy-name crrRolePolicy \

Add replication configuration to the source bucket. Save the following JSON in a file called replication.json to the local directory on your Cloud9 environment. Update the JSON by providing values for the **destination-bucket** and **IAM-role-ARN** that you created above. Save the changes.

	{
		"Role": "IAM-role-ARN",
		"Rules": [
    		{
      			"Status": "Enabled",
      			"Priority": "1",
      			"DeleteMarkerReplication": { "Status": "Disabled" },
      			"Filter" : { "Prefix": "Tax"},
      			"Destination": {
        			"Bucket": "arn:aws:s3:::destination-bucket"
      			}
    		}
    	]
    }

Run the following command to add the replication configuration to your source bucket. Be sure to provide source-bucket name. 

    aws s3api put-bucket-replication \
	--replication-configuration file://replication.json \
	--bucket source bucket name. ex) ticket-service-ui-websitebucket-firstname-lastname> \

However, as S3 doesn't replicate objects retroactively, you need to update the Web UI bucket in source region (Ireland) to replicate objects to the destination bucket in Singapore.

Build you app with by running `npm run build` and upload the UI to the S3 website bucket again to update objects for the replication:

    aws s3 sync --delete dist/ s3://[bucket_name]

Now, you can verify your source bucket objects in Ireland region are replicated to the destination bucket in Singapore region.

### CloudFront Origin Failover

We also need additional configuration on CloudFront when we use the CloudFront with S3 origin for HTTPS on your domain. From Nov 20, you can enable Origin Failover for your CloudFront distributions to improve the availability of content delivered to your end users.

With CloudFront’s Origin Failover capability, you can setup two origins for your distributions - primary (Ireland) and secondary (Singapore), such that your content is served from your secondary origin if CloudFront detects that your primary origin is unavailable. For example, you can have two Amazon S3 buckets that serve as your origin, that you independently upload your content to. If an object that CloudFront requests from your primary bucket is not present or if connection to your primary bucket times-out, CloudFront will request the object from your secondary bucket. So, you can configure CloudFront to trigger a failover in response to either HTTP 4xx or 5xx status codes.

To get started, create the second origin with the same OAI (Origin Access Identity) of the primary origin. You can choose the S3 bucket in the second region (Singapore) that you created above for the Origin Domain Name.

![CloudFront Second Origin](images/cloudfront-secondorigin.png)

Next, create an origin group in which you designate a primary origin for CloudFront plus a second origin that CloudFront automatically switches to when the primary origin returns specific HTTP status code failure responses.

![CloudFront Origin Group](images/cloudfront-origingroup.png)

If you need to remove a file from CloudFront edge caches before it expires, you can do Invalidate the file from edge caches:

    aws cloudfront create-invalidation --distribution-id <value> --paths /

### Test CloudFront Failover

To test the CloudFront Failover, you can delete the S3 bucket (or objects) in primary (Ireland) region. 

*Note.* As you configured the S3 replication, you need to specify the Filter element in a replication configuration rule or delete with specifying an object version ID not to delete the objects in the destincation bucket (Singapore).

You can check the multi-region active-active ticketing system works perfectly though the primary region (Ireland) has an issue in S3 or API gateway. 




