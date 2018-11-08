# S3 Replication and CloudFront with Multi-Region S3 Origins

During the workshop, we focused on the apllication replication using API Gateway, Lambda and DynamoDB, but do not address replication of the website UI layer itself to a second region.

This module provides how you achieve the Web UI layer replication using **S3 Cross Region Replication** and **CloudFront with multi-region S3 Origins**. It is optional module that you can try if you have enough time in the workshop or explore later. 

//add architecture

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

Now, you can verify your source bucket objects in Ireland region are replicated to the destination bucket in Singapore region.

### CloudFront with Multi-Region Amazon S3 Origins

However, we need additional configuration on CloudFront as we used the CloudFront with S3 origin for HTTPS on your domain in the workshop. 

In this module, we configure CloudFront to use [Lambda@Edge](https://docs.aws.amazon.com/lambda/latest/dg/lambda-edge.html) on each request to the origin. This Lambda function resolves a DNS record containing the origin that should be used. You can switch origins by using Amazon Route 53 features like health checks and weighted routing.

Features of Lambda@Edge include:
- Quick to switch between origins (determined by DNS time to live)
- Can be automated in Route 53
- Support for sending only part of the traffic to another bucket
- No need to edit CloudFront configuration
- The same Lambda function can be used by multiple CloudFront distributions

We configure CloudFront to use the Lambda@Edge function on the origin request, so we can do something on each request that will go to Amazon S3. The origin request Lambda is triggered before CloudFront forwards the request to the origin. 



Then add a Origin Custom Header to the origin configuration in CloudFront. The value of this X-DNS-ORIGIN header will be used by our Lambda to know which record to resolve.

When CloudFront gets a request from a client, and the requested object isn’t in the cache, it will trigger our Lambda function. The Lambda reads the value of the X-DNS-ORIGIN header that is part of this request and uses a DNS request to resolve the TXT record with the same name as the value of this header. After doing some validation of the TXT record (it should be in the format $bucketname.s3.$region.amazonaws.com), it will edit the request to point to the bucket in the TXT record. CloudFront gets the object from this bucket and returns it to the client.




