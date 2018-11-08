# S3 Replication and CloudFront with Multi-Region S3 Origins

During the workshop, we focused on the apllication replication using API Gateway, Lambda and DynamoDB, but do not address replication of the website UI layer itself to a second region.

This module provides how you achieve the Web UI layer replication using **S3 Cross Region Replication** and **CloudFront with multi-region S3 Origins**. It is optional module that you can try if you have enough time in the workshop or explore later. 

//add architecture

As you've seen, still this application is not fully active-active multi-region solution as the AWS Cognito exists only in the primary region (Ireland). We will provide additional suggestion for the full stack after re:invent. 

### Module 1_API:

If you manually deploy a region in module 1_API

- Delete the three Lambda functions
