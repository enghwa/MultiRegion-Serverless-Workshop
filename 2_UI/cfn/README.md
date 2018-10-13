# About
This yaml file is used to create the necessary cognito 
resources, e.g. user pool, identity pool, etc.




# Instructions

- cd into cfn folder and execute the following.

```bash
aws cloudformation deploy \
--template-file ticket-service-output.yaml \
--stack-name ticket-service-api \
--capabilities CAPABILITY_IAM
```

- Next, we need to create a Cloudfront distribution for our S3 bucket:

```bash
aws cloudformation deploy \
--region eu-west-1 \
--template-file webs3bucket_with_cloudfront.yaml \
--stack-name ticket-service-ui-cloudfront \
--parameter-overrides S3BucketName=[bucket-name]
```

- You will use the output of the executed template to update reference ids in
  the UI code: [environment.ts](../src/environments/environment.ts) (See TODO Comments in file)



# Useful commands

```bash
aws cloudformation validate-template --template-body file://webs3bucket_with_cloudfront.yaml
```


