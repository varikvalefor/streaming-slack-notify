resource "aws_iam_role" "lambda_slack_authorize_role" {
  name                  = "${var.name}-lambda-slack-authorize-service-role"
  assume_role_policy    = data.aws_iam_policy_document.lambda_assume_role_policy.json
  force_detach_policies = true

  lifecycle {
    create_before_destroy = true
  }
}

###
### Policies are pretty specific to the role so let's put them inline.
###

resource "aws_iam_role_policy" "lambda_slack_authorize_role_cloudwatch_policy" {
  name = "cloudwatch-policy"
  role = aws_iam_role.lambda_slack_authorize_role.id

  policy = <<-EOF
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Action": [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        "Resource": "${aws_cloudwatch_log_group.log_group_lambda_slack_authorize.arn}",
        "Effect": "Allow"
      }
    ]
  }
  EOF
}

resource "aws_iam_role_policy" "lambda_slack_authorize_role_ssm_policy" {
  name = "ssm-policy"
  role = aws_iam_role.lambda_slack_authorize_role.id

  policy = <<-EOF
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Action": [
          "ssm:GetParameters"
        ],
        "Resource": [
          "${aws_ssm_parameter.slack_client_id.arn}",
          "${aws_ssm_parameter.slack_client_secret.arn}",
          "${aws_ssm_parameter.slack_signing_secret.arn}"
        ],
        "Effect": "Allow"
      }
    ]
  }
  EOF
}

resource "aws_iam_role_policy" "lambda_slack_authorize_role_dynamodb_policy" {
  name = "dynamodb-policy"
  role = aws_iam_role.lambda_slack_authorize_role.id

  policy = <<-EOF
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Action": [
          "dynamodb:PutItem"
        ],
        "Resource": [
          "${aws_dynamodb_table.slack.arn}"
        ],
        "Effect": "Allow"
      }
    ]
  }
  EOF
}
