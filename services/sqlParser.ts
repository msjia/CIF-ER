import { TableDefinition, ColumnDefinition } from '../types';

export const parseSQL = (sql: string): TableDefinition[] => {
  const tables: TableDefinition[] = [];
  
  // Split by "CREATE TABLE" to find table blocks
  const tableBlocks = sql.split(/CREATE\s+TABLE/i);

  // Skip the first chunk if it doesn't contain a table definition
  for (let i = 1; i < tableBlocks.length; i++) {
    const block = tableBlocks[i];
    
    // 1. Extract Table Name
    const nameMatch = block.match(/^\s*`?(\w+)`?/);
    if (!nameMatch) continue;
    const tableName = nameMatch[1];

    // 2. Extract Body (between first ( and matching last ))
    const firstParenIndex = block.indexOf('(');
    if (firstParenIndex === -1) continue;

    let parenCount = 1;
    let lastParenIndex = -1;
    
    // Find the matching closing parenthesis for the table body
    // We count parentheses to handle types like decimal(10,2) correctly
    for (let k = firstParenIndex + 1; k < block.length; k++) {
        if (block[k] === '(') parenCount++;
        else if (block[k] === ')') parenCount--;
        
        if (parenCount === 0) {
            lastParenIndex = k;
            break;
        }
    }
    
    if (lastParenIndex === -1) continue;

    const body = block.substring(firstParenIndex + 1, lastParenIndex);
    const afterBody = block.substring(lastParenIndex + 1);

    // Extract comment from the part after the table definition
    const tableCommentMatch = afterBody.match(/COMMENT\s*=\s*'([^']+)'/i);
    const tableComment = tableCommentMatch ? tableCommentMatch[1] : '';
    
    const columns: ColumnDefinition[] = [];
    const primaryKeys: Set<string> = new Set();

    // Pre-scan for PRIMARY KEY (...) definition within the body
    // Handling cases where keys might be quoted or unquoted
    const pkLineMatch = body.match(/PRIMARY KEY\s*\(([^)]+)\)/i);
    if (pkLineMatch) {
      const pkCols = pkLineMatch[1].split(',').map(s => s.trim().replace(/`/g, '').replace(/'/g, ''));
      pkCols.forEach(c => primaryKeys.add(c));
    }

    // 4. Parse Columns
    const rawLines = body.split('\n');

    rawLines.forEach(line => {
      line = line.trim();
      // Skip comments, keys, constraints, etc.
      if (!line || 
          line.startsWith('PRIMARY KEY') || 
          line.startsWith('KEY') || 
          line.startsWith('INDEX') || 
          line.startsWith('UNIQUE') || 
          line.startsWith('CONSTRAINT') || 
          line.startsWith('FOREIGN KEY') ||
          line.startsWith('--') || 
          line.startsWith('/*') ||
          line.startsWith('PARTITION')) {
        return;
      }

      // Regex for column definition: matches `col_name` or col_name at start
      const colNameMatch = line.match(/^`?(\w+)`?/);
      if (!colNameMatch) return;

      const colName = colNameMatch[1];
      
      // Skip if this line is actually a key definition that wasn't caught by startsWith (e.g. indented or different case)
      if (['KEY', 'PRIMARY', 'INDEX', 'UNIQUE', 'CONSTRAINT', 'FOREIGN', 'CHECK'].includes(colName.toUpperCase())) return;

      // Basic type extraction
      // Matches the type definition after the name, e.g., "varchar(50)" or "decimal(17, 2)"
      const remaining = line.substring(colNameMatch[0].length).trim();
      const typeMatch = remaining.match(/^(\w+(?:\([^)]+\))?)/);
      const colType = typeMatch ? typeMatch[1] : 'unknown';

      // Extract comment
      const colCommentMatch = line.match(/COMMENT\s+'([^']+)'/i);
      const colComment = colCommentMatch ? colCommentMatch[1] : '';

      // Check nullable
      const isNotNull = /NOT NULL/i.test(line);

      columns.push({
        name: colName,
        type: colType,
        comment: colComment,
        isPrimaryKey: primaryKeys.has(colName),
        isNullable: !isNotNull
      });
    });

    tables.push({
      id: tableName,
      name: tableName,
      comment: tableComment,
      columns: columns
    });
  }

  return tables;
};

export const INITIAL_SQL = `
/*
 Navicat Premium Data Transfer

 Source Server         : onebox-17
 Source Server Type    : MySQL
 Source Server Version : 80033
 Source Host           : 10.0.24.166:3306
 Source Schema         : ens_cif001

 Target Server Type    : MySQL
 Target Server Version : 80033
 File Encoding         : 65001

 Date: 24/11/2025 13:47:24
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for cif_amend
-- ----------------------------
DROP TABLE IF EXISTS \`cif_amend\`;
CREATE TABLE \`cif_amend\`  (
  \`AMEND_BATCH_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '变更批次号|变更批次号',
  \`AMEND_SEQ_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '变更序号|变更序号',
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`REFERENCE\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易参考号|交易参考号',
  \`AMEND_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '变更日期|变更日期',
  \`SOURCE_TYPE\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '渠道类型|渠道类型',
  \`TRAN_BRANCH\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易机构|交易机构',
  \`AMEND_TYPE\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '账户变更类型|账户变更类型|BASE-基本信息变更,CLIT-客户变更,INDV-对私客户附属信息变更,CORP-对公客户附属信息变更,DOCU-客户证件信息变更,CONT-客户联系信息变更,VERI-对私客户身份核实信息变更,NRA-非居民涉税信息变更,PRA-额度变更,PROD-产品变更,BRAH-机构变更,MAT-期限变更,PINT-停息复息,ADJ-计提调整,RATE-利率变更,SETT-结算账户变更,ATAS-贷款状态变更,REATIVE-贷款关闭后激活',
  \`AMEND_BUSI_SORT\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '变更业务分类|变更业务分类|1-账户 ,2-客户',
  \`BASE_ACCT_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '账号/卡号|用于描述不同账户结构下的账号，如果是卡的话代表卡号，否则代表账号',
  \`PROD_TYPE\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '产品类型|产品类型',
  \`ACCT_CCY\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '账户币种|账户币种 对于AIO账户和一本通账户',
  \`ACCT_SEQ_NO\` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '账户序号|账户序列号，采用顺序数字，表示在同一账号、账户类型、币种下的不同子账户，比如定期存款序列号，卡下选择账户',
  \`AMEND_ITEM\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '修改项|修改项，修改的字段名称，比如账户属性，客户中文名称等的字段名称',
  \`AMEND_KEY\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '变更内容的关键值|变更内容的关键值，比如账户的内部键internal_key,客户的client_key等',
  \`AFTER_VAL\` varchar(2000) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '变更后值|变更后值',
  \`AFTER_VAL1\` varchar(2000) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '变更后值1|变更后值1',
  \`BEFORE_VAL\` varchar(2000) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '变更前值|变更前值',
  \`BEFORE_VAL1\` varchar(2000) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '变更前值1|变更前值1',
  \`NARRATIVE\` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '摘要|开户时的账号用途，销户时的销户原因',
  \`APPR_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '复核标志|复核标志|Y-已复核,N-未复核',
  \`APPROVAL_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '复核日期|复核日期',
  \`APPR_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '复核柜员|复核柜员',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易柜员|交易柜员',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`AMEND_SEQ_NO\`) USING BTREE,
  INDEX \`IDX_CIF_AMEND_1\`(\`CLIENT_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '业务信息变更操作记录|业务信息变更操作记录' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_benefit_owner_info
-- ----------------------------
DROP TABLE IF EXISTS \`cif_benefit_owner_info\`;
CREATE TABLE \`cif_benefit_owner_info\`  (
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`OWNER_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '所有人姓名|所有人姓名',
  \`DOCUMENT_TYPE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '证件类型|证件类型',
  \`DOCUMENT_ID\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '证件号码|证件号码',
  \`MATURITY_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '到期日期|证件的到期日期',
  \`ADDRESS\` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '地址|地址',
  \`IS_SPECIAL_PEOPLE\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '是否特定自然人|是否特定自然人|Y-是,N-否',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`CLIENT_NO\`, \`DOCUMENT_TYPE\`, \`DOCUMENT_ID\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '（对公）受益所有人信息表|（对公）受益所有人信息表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_business
-- ----------------------------
DROP TABLE IF EXISTS \`cif_business\`;
CREATE TABLE \`cif_business\`  (
  \`BUSINESS\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '行业代码|行业代码',
  \`BUSINESS_DESC\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '行业代码说明|行业代码说明',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`BUSINESS\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '行业代码表|行业代码表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_business_parameter
-- ----------------------------
DROP TABLE IF EXISTS \`cif_business_parameter\`;
CREATE TABLE \`cif_business_parameter\`  (
  \`PARA_KEY\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '参数名|参数名',
  \`PARA_VALUE\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '参数值|参数值',
  \`PARA_DESC\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '参数描述|参数描述',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  PRIMARY KEY (\`PARA_KEY\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = 'CIF业务参数表|CIF业务参数表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_category_type
-- ----------------------------
DROP TABLE IF EXISTS \`cif_category_type\`;
CREATE TABLE \`cif_category_type\`  (
  \`CATEGORY_TYPE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户细分类型|客户细分类型',
  \`CATEGORY_DESC\` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户细分类型描述|客户细分类型描述',
  \`CLIENT_TYPE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户类型|客户大类，目前一般分为个人，公司，金融机构和内部客户。取之于CIF_CLIENT_TYPE.CLIENT_TYPE',
  \`INDIVIDUAL_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '对公对私标志|对公对私标志|Y-对私,N-对公',
  \`CORPORATION_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '是否为企业 |是否为企业|Y-是,N-否',
  \`FIN_INSTITUTION\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '金融机构标志|金融机构标志|Y-是,N-否',
  \`BANK_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '是否为银行|是否为银行|Y-是 ,N-不是',
  \`BROKER_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '是否为经纪人|是否为经纪人|Y-是,N-不是',
  \`CENTRAL_BANK_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '是否为中央银行|是否为中央银行|Y-是 ,N-不是',
  \`GOVERNMENT_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '政府部门标志|是否为政府部门|Y-是 ,N-否',
  \`INTL_INSTITUTION_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '国际组织标志|国际组织标志|Y-是,N-否',
  \`JOIN_COLLAT_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '联合体标志|是否为联合体|Y-是 ,N-否',
  \`REP_OFFICE\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '是否为代表处|是否为代表处|Y-是 ,N-不是',
  \`OTHER_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '是否是其他|是否是其他|Y-是,N-否',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`CATEGORY_TYPE\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户类型-细分类表|客户类型-细分类表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_cc_msg_content
-- ----------------------------
DROP TABLE IF EXISTS \`cif_cc_msg_content\`;
CREATE TABLE \`cif_cc_msg_content\`  (
  \`SEQ_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '序号|序号',
  \`WMSG_TYPE\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '短信/微信签约类型|签约类型|W-微信 ,C-短信',
  \`SMS_TYPE\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '短信类型|短信类型|0-短信签约,3-解约短信,01-动账短信',
  \`MSG_TYPE\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '模板编号|模板编号',
  \`SOURCE_TYPE\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '渠道类型|渠道类型',
  \`TRAN_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '交易日期|交易日期',
  \`TRAN_BRANCH\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易机构|交易机构',
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`CLIENT_TYPE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户类型|客户大类，目前一般分为个人，公司，金融机构和内部客户。取之于CIF_CLIENT_TYPE.CLIENT_TYPE',
  \`CH_SURNAME\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '中文姓|中文姓',
  \`SEX\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '性别|性别|M-男,F-女',
  \`CARD_PB_IND\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '卡/折标志|卡/折标志|C-卡,P-折',
  \`BASE_ACCT_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '账号/卡号|用于描述不同账户结构下的账号，如果是卡的话代表卡号，否则代表账号',
  \`CARD_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '卡号|卡号',
  \`WITHDRAWAL_TYPE\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '支取方式|支取方式|S-凭印鉴支取,P-凭密码支取,W-无密码无印鉴支取,B-凭印鉴和密码支取,O-凭证件支取',
  \`TRAN_TYPE_DESC\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易类型描述|交易类型描述',
  \`TRAN_AMT\` decimal(17, 2) NULL DEFAULT NULL COMMENT '交易金额|交易金额',
  \`CR_DR_MAINT_IND\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '借贷标识|借贷标志|C-贷 ,D-借',
  \`ACCT_BALANCE\` decimal(17, 2) NULL DEFAULT NULL COMMENT '账户余额|账户余额',
  \`OTH_BANK_CODE\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '对方银行代码|对方银行代码',
  \`OTH_BANK_NAME\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '对方银行名称|对方银行名称',
  \`OTH_BASE_ACCT_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '对方账号/卡号|对方账号/卡号',
  \`OTH_ACCT_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '对方账户名称|对方账户名称',
  \`RES_PRIORITY\` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '冻结级别|限制级别',
  \`SIGN_STATUS\` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '签约状态|III类户签约状态,贷款模块用于特色产品签约状态|Y-是,N-否,01-有效,02-失效,A-活动,C-解约,S-终止',
  \`MOBILE_PHONE\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '移动电话|移动电话',
  \`CC_CONTENT\` varchar(2000) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '短信内容|短信内容',
  \`SEND_STATUS\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '发送状态 |发送状态|Y-是,N-否',
  \`SEND_SEQ_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '发送流水号|发送流水号',
  \`SEND_END_TIME\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '发送结束时间|发送结束时间',
  \`SEND_START_TIME\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '发送开始时间|发送开始时间',
  \`TASK_EXP_TIME\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '任务终止时间|任务终止时间',
  \`TASK_START_TIME\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '任务开始时间|任务开始时间',
  \`SEND_NO\` int(0) NULL DEFAULT NULL COMMENT '发送次数|发送次数',
  \`ERROR_MSG\` varchar(2000) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '错误代码|错误代码',
  \`PARTITION_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '分区标志|分区标志|Y-是,N-否',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`SEQ_NO\`, \`CLIENT_NO\`) USING BTREE,
  INDEX \`IDX_CIF_CC_MSG_CONTENT_1\`(\`CLIENT_NO\`) USING BTREE,
  INDEX \`IDX_CIF_CC_MSG_CONTENT_3M\`(\`TRAN_DATE\`) USING BTREE,
  INDEX \`IDX_CIF_CC_MSG_CONTENT_2M\`(\`MOBILE_PHONE\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '短信信息表|短信信息表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_channel_control
-- ----------------------------
DROP TABLE IF EXISTS \`cif_channel_control\`;
CREATE TABLE \`cif_channel_control\`  (
  \`CONTROL_SEQ_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '控制编号|控制编号',
  \`CONTROL_TYPE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '控制类型|控制类型|DRW-放款交易,REC-还款交易,00-暂停非柜面,01-网上银行渠道控制,02-手机银行渠道控制,03-网关支付渠道控制,04-快捷支付渠道控制,05-POS机渠道控制,06-ATM/CRS渠道控制',
  \`AUTH_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '授权柜员|授权柜员',
  \`LAST_CHANGE_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '最后修改日期|最后修改日期',
  \`LAST_CHANGE_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '最后修改柜员|最后修改柜员',
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`TRAN_BRANCH\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易机构|交易机构',
  \`CONTROL_STATUS\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '控制状态|控制状态|A-生效中,E-已终止,F-未生效(将来某天开始生效)',
  \`LIMIT_LEVEL\` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '限制级别|限制级别|CUST-客户级别,ACCT-账户级别,CARD-卡片级别',
  \`DOCUMENT_ID\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '证件号码|证件号码',
  \`START_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '开始日期|限制开始日期',
  \`END_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '结束日期|限制结束日期',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易时间戳|交易时间戳',
  \`NARRATIVE\` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '摘要|开户时的账号用途，销户时的销户原因',
  PRIMARY KEY (\`CONTROL_SEQ_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户渠道限制表|客户渠道限制数据记录' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_class_1
-- ----------------------------
DROP TABLE IF EXISTS \`cif_class_1\`;
CREATE TABLE \`cif_class_1\`  (
  \`CLASS1\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '分类1|客户分类1',
  \`CLASS_DESC\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '分类描述|分类描述',
  \`COUNTER_PARTY\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '对手|对手',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`CLASS1\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户分类1表|客户分类1表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_class_2
-- ----------------------------
DROP TABLE IF EXISTS \`cif_class_2\`;
CREATE TABLE \`cif_class_2\`  (
  \`CLASS2\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '分类2|客户分类2',
  \`CLASS_DESC\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '分类描述|分类描述',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`CLASS2\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户分类2表|客户分类2表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_class_3
-- ----------------------------
DROP TABLE IF EXISTS \`cif_class_3\`;
CREATE TABLE \`cif_class_3\`  (
  \`CLASS3\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '分类3|客户分类3',
  \`CLASS_DESC\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '分类描述|分类描述',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`CLASS3\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户分类3表|客户分类3表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_class_4
-- ----------------------------
DROP TABLE IF EXISTS \`cif_class_4\`;
CREATE TABLE \`cif_class_4\`  (
  \`CLASS4\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '分类4|客户分类4',
  \`CLASS_DESC\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '分类描述|分类描述',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`CLASS4\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户分类4表|客户分类4表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_class_5
-- ----------------------------
DROP TABLE IF EXISTS \`cif_class_5\`;
CREATE TABLE \`cif_class_5\`  (
  \`CLASS5\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '分类5|客户分类5',
  \`CLASS_DESC\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '分类描述|分类描述',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`CLASS5\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户分类5表|客户分类5表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_class_level
-- ----------------------------
DROP TABLE IF EXISTS \`cif_class_level\`;
CREATE TABLE \`cif_class_level\`  (
  \`CLASS_LEVEL\` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '综合评级|综合评级，用于客户等级划分',
  \`CLASS_LEVEL_DESC\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '综合评级描述|综合评级描述',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`CLASS_LEVEL\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户综合评级参数表|定义客户综合评级的级别代码与描述' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client\`;
CREATE TABLE \`cif_client\`  (
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`CLIENT_SHORT\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户简称|客户简称',
  \`CLIENT_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户名称|客户名称',
  \`CH_CLIENT_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户中文名称|客户中文名称',
  \`EN_CLIENT_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户英文名称|客户英文名称',
  \`EN_CLIENT_SHORT\` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户英文简称|客户英文简称',
  \`CLIENT_TYPE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户类型|客户大类，目前一般分为个人，公司，金融机构和内部客户。取之于CIF_CLIENT_TYPE.CLIENT_TYPE',
  \`CATEGORY_TYPE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户细分类型|客户细分类型',
  \`CLIENT_TRAN_STATUS\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户交易状态|客户交易状态|A-活动,C-已注销,D-休眠',
  \`CTRL_BRANCH\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '控制分行|控制分行',
  \`ACCT_EXEC\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户经理|客户经理',
  \`DEPARTMENT\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '部门|部门',
  \`PROFIT_CENTER\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '利润中心 |利润中心',
  \`SOURCE_TYPE\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '渠道类型|渠道类型',
  \`CREATE_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '创建日期|创建日期',
  \`COUNTRY_LOC\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '国籍|国籍',
  \`STATE\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '省别代码|省、州',
  \`CLIENT_CITY\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '城市代码|城市代码',
  \`DISTRICT\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '区号|区号',
  \`POSTAL_CODE\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '邮政编码|邮政编码',
  \`ADDRESS\` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '地址|地址',
  \`INFO_LACK\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '资料不全标志|资料不全标志|Y-是,N-否',
  \`CLIENT_INDICATOR\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户标识|客户标识|N-普通客户,S-银行员工客户,V-VIP客户,M-潜在客户',
  \`INTERNAL_IND_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '内部客户标志|是否为内部客户|Y-内部客户,N-非内部客户',
  \`TEMP_CLIENT\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '临时客户标志|是否为临时客户|Y-临时客户,N-正式客户',
  \`INLAND_OFFSHORE\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '境内境外标志|境内境外标志|I-境内,O-境外',
  \`BLACKLIST_IND_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '是否黑名单客户|是否黑名单客户|Y-是,N-否',
  \`CIF_VER_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户级核实标志|客户级核实标志（用于核实客户名下多个一类户）|Y-已核实,N-未核实',
  \`UNPROVIDE_ID_REASON\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '未提供识别号原因|未提供识别号原因|1-居民国（地区）不发放纳税人识别号,2-账户持有人未能取得纳税人识别号',
  \`NAME_SUFFIX\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户名后缀|客户名后缀',
  \`CLIENT_MNEMONIC\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '助记名称|助记名称',
  \`CLIENT_ALIAS\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '别名|别名',
  \`CLIENT_GRP\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户组|客户组',
  \`COUNTRY_CITIZEN\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '居住国家|居住国家',
  \`COUNTRY_RISK\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '风险控制国家|风险控制国家',
  \`IS_FORMAL\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '弱实名客户标志|是否弱实名客户|Y-是,N-否',
  \`CLIENT_STATUS\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户状态|客户状态',
  \`CLIENT_STATUS_DESC\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户状态描述|客户状态描述',
  \`CLASS_LEVEL_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '评级日期|评级日期',
  \`TAX_COUNTRY\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '税收居民国|税收居民国',
  \`TAX_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '是否税信息|是否税信息|Y-是,N-否',
  \`TAXABLE_IND\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '收税标志|是否收税|Y-收税,N-不收税',
  \`TAX_REMARK\` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '税收备注|税收备注',
  \`TAXPAYER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '纳税人识别号|纳税人识别号',
  \`INVOICE_TYPE\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '发票类型|发票类型|N-普通发票 ,S-专用发票 ,D-不开票',
  \`TAX_ORG_TYPE\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '税收机构类型|税收机构类型|1-消极非金融机构,2-其他非金融机构',
  \`TAXPAYER_TYPE\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '纳税人类型|纳税人类型|1-一般纳税人 ,2-小规模纳税人 ,3-个人 ,4-国有企业',
  \`CLIENT_SPREAD\` decimal(15, 8) NULL DEFAULT NULL COMMENT '客户浮动|客户浮动',
  \`PAY_AGENT_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '代付标志|代付标志（Y/N）|Y-是,N-否',
  \`REC_AGENT_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '代收标志|代收标志（Y/N）|Y-是,N-否',
  \`WRN_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '贷款核销标志|贷款核销标志（Y/N）|Y-是,N-否',
  \`YDT_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户级易贷通标志|客户级易贷通标志（用于判断客户是否签约易贷通）|Y-是,N-否',
  \`PEP_IND_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT 'PEP客户标志|此客户是否是PEP客户（政治敏感人物）|Y-是,N-否',
  \`INDUSTRY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '通用行业代码|通用行业代码',
  \`BUSINESS\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '行业代码|行业代码',
  \`CLASS1\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '分类1|客户分类1',
  \`CLASS2\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '分类2|客户分类2',
  \`CLASS3\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '分类3|客户分类3',
  \`CLASS4\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '分类4|客户分类4',
  \`CLASS5\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '分类5|客户分类5',
  \`CLASS_LEVEL\` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '综合评级|综合评级，用于客户等级划分',
  \`CR_RATING\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户信用等级|客户等级 客户信用等级|001-1级,002-2级,003-3级,004-4级',
  \`RISK_WEIGHT\` int(0) NULL DEFAULT NULL COMMENT '风险权重|风险等级',
  \`NARRATIVE\` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '摘要|开户时的账号用途，销户时的销户原因',
  \`PRINT_LANGUAGE\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '打印语言|打印语言|C-中文,E-英文',
  \`SPOKEN_LANGUAGE\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交流语言|交流语言|E-英文,C-中文',
  \`WRITTEN_LANGUAGE\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '书写语言|书写语言|E-英文,C-中文',
  \`CLOSED_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '关闭日期|关闭日期',
  \`CLOSE_REASON\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '注销原因|注销原因:客户注销时，需要登记客户注销原因',
  \`OLD_CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '原客户号|原客户号',
  \`CREATION_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '创建柜员|创建柜员',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`LAST_CHANGE_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '最后修改日期|最后修改日期',
  \`LAST_CHANGE_TIME\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '上次修改时间|上次修改时间',
  \`LAST_CHANGE_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '最后修改柜员|最后修改柜员',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  \`CLIENT_POINT\` bigint(0) NULL DEFAULT NULL COMMENT '客户积分|客户积分',
  \`CONTRIBUTE_DEGREE\` int(0) NULL DEFAULT NULL COMMENT '贡献度|存贷模块可根据客户贡献度配置利率等信息',
  \`IS_JOINT_CUSTOMER\` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '是否联名客户|是否联名客户|Y-是，N-否',
  \`TAX_RESIDENT_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '税收居民标识|税收居民标识|1-中国税收居民,2-非居民,3-既是中国税收居民又是其他国家（地区）税收居民',
  \`ACCT_VERIFY_STATE\` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户核实状态|客户是否被核实',
  \`PASSWORD\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '密码|客户密码',
  \`PASSWORD_STATUS\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '密码状态|密码状态|A-正常 ,L-锁定 ',
  \`FAILURE_TIMES\` int(0) NULL DEFAULT NULL COMMENT '累积失败次数|失败次数',
  \`CORP_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '是否小微企业|是否小微企业',
  \`CLIENT_GROUP\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户群组\r\n|客户群组',
  \`BRANCH_INNER_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '是否机构内客户标志|是否机构内客户标志|Y-是,N-否',
  \`FIRST_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '名',
  \`MID_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '中间名',
  \`LAST_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '姓',
  \`ANNUAL_STATUS\` varchar(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '年检状态|年检通过状态|Y-已年检,N-未年检',
  \`NEXT_ANNUAL_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '下一年检日期|下一年检日期',
  \`LAST_ANNUAL_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '下一年检日期|下一年检日期',
  PRIMARY KEY (\`CLIENT_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户信息表|客户信息表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_annual_info
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_annual_info\`;
CREATE TABLE \`cif_client_annual_info\`  (
  \`CLIENT_TYPE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户类型|客户大类，目前一般分为个人，公司，金融机构和内部客户。取之于CIF_CLIENT_TYPE.CLIENT_TYPE',
  \`SEX\` varchar(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '性别|性别|M-男,F-女',
  \`DOCUMENT_TYPE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '证件类型|证件类型',
  \`DOCUMENT_ID\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '证件号码|证件号码',
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户号|客户号',
  \`ISS_COUNTRY\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '发证国家|发证国家',
  \`VERIFICATION_RESULT\` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '核查结果|核查结果|01-未核实 ,02-真实 ,03-虚假 ,04-假名 ,05-匿名 ,06-无法核实 ,07-在有疑义时销户,00-已核实 ',
  \`SEQ_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '序号|序号',
  \`DATE\` datetime(0) NULL DEFAULT NULL COMMENT '日期|日期',
  PRIMARY KEY (\`SEQ_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户年检信息表|客户年检信息表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_approval
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_approval\`;
CREATE TABLE \`cif_client_approval\`  (
  \`ORDER_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '预约编号|预约编号',
  \`APPLY_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '申请日期|申请日期',
  \`CDD_SCORE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT 'cdd评分|cdd评分',
  \`BIRTH_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '出生日期|出生日期',
  \`LOCAL_FILE_PATH\` varchar(2000) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '本地文件路径|本地文件路径',
  \`APPROVAL_VIEW\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '审批意见|审批意见',
  \`AML_FLAG\` varchar(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '是否命中AML|是否命中AML',
  \`DOCUMENT_NO\` varchar(2000) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '证件号码|证件号码',
  \`USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易柜员|交易柜员',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易时间戳|交易时间戳',
  \`DEAL_STATUS\` varchar(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '处理状态|处理状态|0-未处理,1-已处理',
  \`CDD_GRADE\` varchar(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT 'cdd等级|cdd等级',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  \`JSON_PEOPLE\` varchar(7000) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '个人信息大字段|个人信息大字段',
  \`CLIENT_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户名称|客户名称',
  \`CONTACT_TEL\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '联系电话  |联系电话  ',
  \`SEX\` varchar(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '性别|性别|M-男,F-女',
  \`DOCUMENT_TYPE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '证件类型|证件类型',
  \`EMAIL\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '电子邮件|电子邮件',
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号|Y-是,N-否',
  PRIMARY KEY (\`ORDER_NO\`, \`CLIENT_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户信息审批表|客户信息审批表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_approval_detail
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_approval_detail\`;
CREATE TABLE \`cif_client_approval_detail\`  (
  \`ORDER_NUM\` int(0) NULL DEFAULT NULL COMMENT '排序 |排序 ',
  \`USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易柜员|交易柜员',
  \`SEQ_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '序号|序号',
  \`DEAL_STATUS\` varchar(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '处理状态|处理状态|0-未处理,1-已处理',
  \`ORDER_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '预约编号|预约编号',
  \`APPLY_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '申请日期|申请日期',
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户号|客户号',
  \`FLOW_NAME\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '流程名称|流程名称',
  PRIMARY KEY (\`SEQ_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户审批流程状态表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_approval_ecdd_hist
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_approval_ecdd_hist\`;
CREATE TABLE \`cif_client_approval_ecdd_hist\`  (
  \`LOCAL_FILE_PATH\` varchar(2000) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '本地文件路径|本地文件路径',
  \`APPROVAL_VIEW\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '审批意见|审批意见',
  \`DOCUMENT_NO\` varchar(2000) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '证件号码|证件号码',
  \`BIRTH_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '出生日期|出生日期',
  \`EMAIL\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '电子邮件|电子邮件',
  \`SEX\` varchar(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '性别|性别|M-男,F-女',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易时间戳|交易时间戳',
  \`DEAL_STATUS\` varchar(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '处理状态|处理状态|0-未处理,1-已处理',
  \`CLIENT_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户名称|客户名称',
  \`ORDER_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '预约编号|预约编号',
  \`APPLY_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '申请日期|申请日期',
  \`CONTACT_TEL\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '联系电话  |联系电话  ',
  \`USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易柜员|交易柜员',
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户号|客户号',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  \`DOCUMENT_TYPE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '证件类型|证件类型',
  PRIMARY KEY (\`ORDER_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户ecdd审批历史表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_approval_kyc_hist
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_approval_kyc_hist\`;
CREATE TABLE \`cif_client_approval_kyc_hist\`  (
  \`DEAL_STATUS\` varchar(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '处理状态|处理状态|0-未处理,1-已处理,03-已跳过',
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`APPROVAL_VIEW\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '审批意见|审批意见',
  \`SEX\` varchar(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '性别|性别|M-男,F-女',
  \`DOCUMENT_NO\` varchar(2000) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '证件号码|证件号码',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  \`LOCAL_FILE_PATH\` varchar(2000) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '本地文件路径|本地文件路径',
  \`USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易柜员|交易柜员',
  \`APPLY_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '申请日期|申请日期',
  \`BIRTH_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '出生日期|出生日期',
  \`CLIENT_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户名称|客户名称',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易时间戳|交易时间戳',
  \`EMAIL\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '电子邮件|电子邮件',
  \`DOCUMENT_TYPE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '证件类型|证件类型',
  \`CONTACT_TEL\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '联系电话  |联系电话  ',
  \`ORDER_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '预约编号|预约编号',
  PRIMARY KEY (\`CLIENT_NO\`, \`ORDER_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户KYC历史表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_attach
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_attach\`;
CREATE TABLE \`cif_client_attach\`  (
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`MOTHERS_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '母亲姓名|母亲姓名',
  \`KYC_FLAG\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT 'kyc标志|kyc标志',
  \`NPWP_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '税务标志|税务标志',
  \`NPWP_NUMBER\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '税务编号|税务编号',
  \`SOURCE_OF_INCOME\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '收入来源|收入来源',
  \`SPOUSE_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '配偶姓名|配偶姓名',
  \`SPOUSE_DOCUMENT_ID\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '配偶证件号码|配偶证件号码',
  \`SPOUSE_DATE_OF_BIRTH\` varchar(8) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '配偶生日|配偶生日',
  \`SPOUSE_REAL_ESTATE_CONTRACT\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '配偶房产合同|配偶房产合同',
  \`ACCOUNT_OPEN_PURPOSE\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '开户原因|开户原因',
  \`RELATIONSHIP_TO_BANK\` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '是否关联|是否关联',
  \`DEBTOR_CATEGORY\` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '借款人类别|借款人类别',
  \`PRENUPIAL_AGREEMENT\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '婚前协议|婚前协议',
  \`AML_LAST_REVIEW_DATE\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT 'AML最后核查时间|AML最后核查时间',
  \`AML_NEXT_REVIEW_DATE\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT 'AML下次核查时间|AML下次核查时间',
  \`RISK_SCORE\` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT 'AML风险评分|AML风险评分',
  \`PEP\` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT 'AML政要级别|AML政要级别',
  \`RISK_CLASSIFICATIONS\` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '风险分类|风险分类',
  \`RISK_RATING_REVIEW_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '风险评级审查日期|风险评级审查日期',
  \`RISK_RATING_EXPIRY_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '风险评级有效日期|风险评级有效日期',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`CLIENT_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户信息关联表|客户信息附属信息表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_block
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_block\`;
CREATE TABLE \`cif_client_block\`  (
  \`SEQ_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '序号|序号',
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`BLOCK_DATE\` datetime(0) NOT NULL COMMENT '冻结日期|冻结日期',
  \`BLOCK_GROUP_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '是否群冻结|是否群冻结|Y-是 ,N-否',
  \`BLOCK_REASON\` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '冻结原因|冻结原因|01-睡眠户冻结,02-资料不全冻结,03-黑名单批量冻结,04-黑名单增量冻结,05-其它',
  \`BLOCK_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '冻结柜员|冻结柜员',
  \`BLOCK_AUTH_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '冻结授权柜员|冻结授权柜员',
  \`UNFROZEN_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '解冻标志|解冻标志|N-否,Y-是',
  \`UNBLOCK_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '解冻日期|解冻日期',
  \`UNBLOCK_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '解冻柜员|解冻柜员',
  \`UNBLOCK_AUTH_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '解冻授权柜员|解冻授权柜员',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`SEQ_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户冻结信息表|客户冻结信息表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_block_log
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_block_log\`;
CREATE TABLE \`cif_client_block_log\`  (
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`CHECK_DATE\` datetime(0) NOT NULL COMMENT '检查日期|检查日期',
  \`REFERENCE\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易参考号|交易参考号',
  \`BL_DESC\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '描述|描述',
  \`CHECK_REASON\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '检查描述|检查描述',
  \`PROGRAM_ID\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易代码|交易代码',
  \`SOURCE_MODULE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '源模块|源模块|RB-存款,CL-贷款,GL-总账,ALL-所有',
  \`APPR_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '复核柜员|复核柜员',
  \`CHECK_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '检查柜员|检查柜员',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`CLIENT_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户冻结黑名单检查登记簿|客户冻结黑名单检查登记簿' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_commission
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_commission\`;
CREATE TABLE \`cif_client_commission\`  (
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`COMMISSION_CLIENT_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '代办人名称|代办人名称',
  \`COMMISSION_DOCUMENT_ID\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '代办人证件号码|代办人证件号码',
  \`COMMISSION_DOCUMENT_TYPE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '代办人证件类型|代办人证件类型',
  \`COMMISSION_EXPIRE_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '代办人证件到期日|代办人证件到期日',
  \`LAST_CHANGE_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '最后修改柜员|最后修改柜员',
  \`LAST_CHANGE_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '最后修改日期|最后修改日期',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`CLIENT_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户开立代办人信息表|客户开立代办人信息表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_conf_info
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_conf_info\`;
CREATE TABLE \`cif_client_conf_info\`  (
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`SEQ_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '序号|序号',
  \`INFO_TYPE\` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '保密信息类型|保密信息类型|01-曾用名（中）,02-曾用名（英）,03-曾用国税登记号,04-曾用地税登记号,05-曾用营业执照号码,06-法人变更信息',
  \`CCY\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '币种|币种',
  \`AMOUNT\` decimal(17, 2) NULL DEFAULT NULL COMMENT '金额|金额',
  \`ASSET\` decimal(17, 2) NULL DEFAULT NULL COMMENT '资产|资产',
  \`CASH\` decimal(17, 2) NULL DEFAULT NULL COMMENT '现金|现金',
  \`EXPENSES\` decimal(17, 2) NULL DEFAULT NULL COMMENT '支出金额|支出金额',
  \`MON_HOUSEHOLD_INC\` decimal(17, 2) NULL DEFAULT NULL COMMENT '家庭月收入|家庭月收入',
  \`MON_OTHER_INC\` decimal(17, 2) NULL DEFAULT NULL COMMENT '月其它收入|月其它收入',
  \`PREMISES\` decimal(17, 2) NULL DEFAULT NULL COMMENT '房产金额|房产金额',
  \`DETAILS\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '明细|明细',
  \`LIABILITIES\` decimal(17, 2) NULL DEFAULT NULL COMMENT '负债|负债',
  \`STOCK\` decimal(17, 2) NULL DEFAULT NULL COMMENT '股份/股票|股份/股票',
  \`CREATE_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '创建日期|创建日期',
  \`CREATION_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '创建柜员|创建柜员',
  \`LAST_CHANGE_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '最后修改日期|最后修改日期',
  \`LAST_CHANGE_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '最后修改柜员|最后修改柜员',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`SEQ_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户保密信息表|客户保密信息表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_contact_tbl
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_contact_tbl\`;
CREATE TABLE \`cif_client_contact_tbl\`  (
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`CONTACT_TYPE\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '联系类型|联系类型',
  \`CITY_TEL\` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '电话区号|电话区号',
  \`CONTACT_TEL\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '联系电话  |联系电话',
  \`MOBILE_PHONE\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '移动电话|移动电话',
  \`COUNTRY\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '国家|国家',
  \`COUNTRY_TEL\` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '国家电话区号|国家电话区号',
  \`STATE\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '省别代码|省、州',
  \`CITY\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '城市|城市',
  \`CITY_DIST\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '区/县|区/县',
  \`POSTAL_CODE\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '邮政编码|邮政编码',
  \`PREF_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '首选标志|是否为首选|Y-首选,N-不是首选',
  \`ADDRESS_ID\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '地址编号|地址编号',
  \`ADDRESS\` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '地址|地址',
  \`ADDRESS1\` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '地址1|地址1 客户详细地址',
  \`ADDRESS2\` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '地址2|地址2',
  \`ADDRESS3\` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '地址3|地址3',
  \`ADDRESS4\` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '地址4|地址4',
  \`ROUTE\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '联系方式类型|联系方式类型|SWIFT-SWIFT电文,POSTAL-邮寄',
  \`PHONE_REPEAT_DEAL\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户移动电话手机号重复处理标识|校验客户移动电话手机号是否重复，若有重复会返回重复客户数组，有如下3种处理方式：1）报文中PHONE_REPEAT_DEAL=S(SHARED),说明手机号重复在前端交互选择了共用手机号，则需要插入CIF_SHAED_PHONES表；2）报文中PHONE_REPEAT_DEAL=B(BLACK),说明手机号重复在前端交互选择了不共用手机号，则需要插入RC_CHECK_LIST黑名单核实表；3）报文中不存在PHONE_REPE说明未经柜面开立的客户，默认为PHONE_REPEAT_DEAL=B处理.AT_DEAL或值为空，|N-不重复 ,S-重复入共享 ,B-重复入核实表',
  \`CONTACT_TEL_UPDATE_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '联系电话更新日期|联系电话更新日期',
  \`LINKMAN\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '对账联系人|对账联系人',
  \`SALUTATION\` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '称呼|称呼',
  \`BIC_CODE\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT 'BIC代码|BIC代码',
  \`LAST_CHANGE_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '最后修改日期|最后修改日期',
  \`LAST_CHANGE_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '最后修改柜员|最后修改柜员',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  \`EMAIL\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '电子邮件|电子邮件',
  \`RT\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '地区编号|地区编号',
  \`RW\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '地区编码|地区编码',
  \`SUB_DISTRICT\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '子区|子区',
  \`DESPATCH_CODE\` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '发送代码|发送代码',
  \`MOBILE_PHONE2\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '移动电话2|移动电话2',
  PRIMARY KEY (\`CLIENT_NO\`, \`CONTACT_TYPE\`) USING BTREE,
  INDEX \`IDX_CIF_CLIENT_CONTACT_TBL_1M\`(\`CONTACT_TEL\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户联系信息表|客户联系信息表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_corp
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_corp\`;
CREATE TABLE \`cif_client_corp\`  (
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`CLIENT_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户名称|客户名称',
  \`ORGAN\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '组织机构代码|组织机构代码',
  \`FIN_APP_CODE\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '金融机构许可证号|金融机构许可证号',
  \`INP_EXP_NO\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '进出口业务经营资格编号|进出口业务经营资格编号',
  \`BUSILICENCE_STATUS\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '营业执照状态|营业执照状态|1-正常年检,2-未年检,3-吊销,4-注销',
  \`CORP_SIZE\` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '企业规模 |企业规模|9_其他,CS01_大型企业,CS02_中型企业,CS03_小型企业,CS04_微型企业',
  \`EMP_NUM\` int(0) NULL DEFAULT NULL COMMENT '员工数|员工数',
  \`HIGHER_ORGAN\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '主管单位|主管单位',
  \`ORIGIN_COUNTRY\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '注册国家|注册国家',
  \`INCOR_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '公司成立日期|公司成立日期',
  \`BASIC_ACCT_OPENAT\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '基本账户开户行|基本账户开户行',
  \`BASE_ACCT_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '账号/卡号|用于描述不同账户结构下的账号，如果是卡的话代表卡号，否则代表账号',
  \`REGISTER_NO_TYPE\` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '登记注册号类型|登记注册号类型|01-工商注册号,02-机关和事业单位登记号,03-社会团体登记号,04-民办非企业单位登记号,05-基金会登记号,06-宗教活动场所登记号,09-其他',
  \`REGISTER_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '登记日期|登记日期',
  \`CESSATION_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '终止日期|终止日期，对公企业专业',
  \`REP_EXPIRY_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '法人代表证件到期日|法人代表证件到期日',
  \`REP_ISS_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '法人证件签发日期|法人证件签发日期',
  \`ECON_TYPE\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '经济类型|经济类型',
  \`LEGAL_REP\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法定代表人名称|法定代表人名称',
  \`REP_DOCUMENT_TYPE\` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法定代表人身份证件类型|法定代表人身份证件类型',
  \`REP_DOCUMENT_ID\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法定代表人身份证件号码|法定代表人身份证件号码',
  \`REP_PHONE\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人代表手机号|法人代表手机号',
  \`BUSINESS_SCOPE\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '经营范围|经营范围',
  \`SPECIAL_APP_NO\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '特殊行业许可证书号|特殊行业许可证书号',
  \`TAX_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '是否税信息|是否税信息|Y-是,N-否',
  \`TAXPAYER_ADDRESS\` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '纳税人地址|纳税人地址',
  \`UNPROVIDE_ID_REASON\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '未提供识别号原因|未提供识别号原因|1-居民国（地区）不发放纳税人识别号,2-账户持有人未能取得纳税人识别号',
  \`TAXPAYER_NAME\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '纳税人名称|纳税人名称',
  \`TAXPAYER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '纳税人识别号|纳税人识别号',
  \`TAX_FILE_NO\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '国税登记号|国税登记号',
  \`LOCAL_TAX_FILE_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '地方税务证号|地方税务证号',
  \`TAX_CER_AVAI\` datetime(0) NULL DEFAULT NULL COMMENT '税务证有效期|税务证有效期',
  \`CESSATION\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '终止类型|终止类型',
  \`BANK_ID\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '银行ID|银行ID',
  \`CENTRAL_BANK_REF\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '中央银行|中央银行',
  \`PAID_UP_CAPITAL\` decimal(17, 2) NULL DEFAULT NULL COMMENT '实收资本|实收资本',
  \`PAID_CAPITAL_CCY\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '实收资本币种|实收资本币种',
  \`AUTH_CAPITAL\` decimal(17, 2) NULL DEFAULT NULL COMMENT '注册资本|注册资本',
  \`CAPITAL_CCY\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '注册资本币种|注册资本币种',
  \`MOODY_RATE\` decimal(15, 8) NULL DEFAULT NULL COMMENT '外部浮动利率|外部浮动利率',
  \`PHONE_FAX_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '电话/传真指令指定客户标志|是否电话/传真指令指定客户|Y-是,N-否',
  \`SUC_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '社会统一信用代码标志|是否社会统一信用代码标志|Y-是,N-否',
  \`COMPANY_SECRETARY_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '是否指定公司秘书|是否指定公司秘书|Y-是,N-否',
  \`NON_RESIDENT_CTRL_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '运营国外控制标志|运营是否国外控制|Y-是,N-否',
  \`REF_INTERMEDIARY_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '中介推崇标志|是否中介推崇|Y-是,N-否',
  \`MINORITY_INTEREST_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '最小控股标志|是否最小控股,不能超过10%的股权|Y-是,N-否',
  \`TRAN_EMAIL\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易用EMAIL|交易用EMAIL',
  \`FORE_REMIT_CER_AVAI\` datetime(0) NULL DEFAULT NULL COMMENT '外汇证有效期  |外汇证有效期',
  \`FITCH\` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT 'Fitch等级|Fitch等级',
  \`SP_RATE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT 'SP等级  |SP等级',
  \`LOAN_GRADE\` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '贷方级别|贷方级别',
  \`REGISTER_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '登记注册号|登记注册号',
  \`EXPOSURE_CAP\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '风险控制标志|是否风险控制|Y-是,N-否',
  \`LOAN_CARD_ID\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '该企业贷款使用的贷款卡编码|该企业贷款使用的贷款卡编码；中国人民银行统一编发给借款人、担保人、出资人的代码，作为其在企业征信系统的唯一标识',
  \`CHECK_YEAR\` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '工商执照年检年份|工商执照年检年份',
  \`CORP_PLAN\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '公司计划  |公司计划',
  \`OFF_WEBSITE\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '官方网站|官方网站',
  \`COUNTRY\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '国家|国家',
  \`BORROWER_GRADE\` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '借款人等级|借款人等级',
  \`ECON_DIST\` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '经济特区|经济特区',
  \`MARKET_PARTICIPANT\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '市场参与者|市场参与者',
  \`LENDING_OFFICER_IND\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '是否指定贷款副负责人|是否指定贷款副负责人|Y-是,N-否',
  \`DIRECTOR_IND\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '是否指定银行负责人|是否指定银行负责人|Y-是,N-否',
  \`OWNERSHIP\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '所有权|所有权',
  \`INVESTOR\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '投资人|投资人',
  \`FX_REGISTER_ID\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '外汇登记证|外汇登记证',
  \`FX_ISS_PLACE\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '外汇登记证签发地|外汇登记证签发地',
  \`FX_ISS_ORGAN\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '外汇等级证号|外汇等级证号',
  \`FOREIGN_APP_NO\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '外商投资批准证书号|外商投资批准证书号',
  \`PD\` decimal(5, 2) NULL DEFAULT NULL COMMENT '违约机率|违约机率',
  \`BANK_CODE\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '银行代码|在同一个表中两个不同字段的中文注释都为银行代码',
  \`SWIFT_ID\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '银行国际代码|银行国际代码',
  \`SUB_DIRECTOR_IND\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '指定贷款负责人标志|是否指定贷款负责人|Y-是,N-否',
  \`SUB_LENDING_OFFICER_IND\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '指定银行副负责人标志|是否指定银行副负责人|Y-是,N-否',
  \`PHONE_FAX_ACCT_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '电话/传真指令指定账户客户标志|是否电话/传真指令指定账户客户|Y-是,N-否',
  \`REMARK\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '备注|备注',
  \`LAST_CHANGE_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '最后修改柜员|最后修改柜员',
  \`LAST_CHANGE_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '最后修改日期|最后修改日期',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  \`BIRTH_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '出生日期|出生日期',
  PRIMARY KEY (\`CLIENT_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '法人客户附加信息表|法人客户附加信息表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_document
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_document\`;
CREATE TABLE \`cif_client_document\`  (
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`DOCUMENT_TYPE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '证件类型|证件类型',
  \`DOCUMENT_ID\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '证件号码|证件号码',
  \`ISS_COUNTRY\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '发证国家|发证国家',
  \`ISS_STATE\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '签发省、州|签发省、州',
  \`ISSUE_BRANCH\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '签发机构|签发机构',
  \`ISS_PLACE\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '签发地|签发地',
  \`ISS_CITY\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '签发城市|签发城市',
  \`ISS_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '签发日期|签发日期',
  \`MATURITY_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '到期日期|到期日期',
  \`PREF_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '首选标志|是否为首选地址|Y-首选联系信息 ,N-不是首选联系信息',
  \`DIST_CODE\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '地区代码|地区代码',
  \`DIST_CODE_DESC\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '地区代码描述|地区代码描述',
  \`PASSPORT_TYPE\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '护照类型|护照类型|P-因私护照,C-因公护照',
  \`NEW_DOCUMENT_ID\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '变更后证件号码|新证件号码',
  \`OTHER_DOCUMENT\` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '其他证件名称|其他证件名称',
  \`INSPECT_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '上次核查日期|上次核查日期',
  \`LAST_CHANGE_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '最后修改日期|最后修改日期',
  \`LAST_CHANGE_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '最后修改柜员|最后修改柜员',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  \`visa_type\` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL,
  PRIMARY KEY (\`CLIENT_NO\`, \`DOCUMENT_TYPE\`, \`DOCUMENT_ID\`, \`ISS_COUNTRY\`) USING BTREE,
  INDEX \`IDX_CIF_CLIENT_DOCUMENT_1M\`(\`DOCUMENT_TYPE\`, \`ISS_COUNTRY\`, \`DOCUMENT_ID\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户证件信息|客户证件信息' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_indvl
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_indvl\`;
CREATE TABLE \`cif_client_indvl\`  (
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`CH_GIVEN_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '中文名|中文名',
  \`CH_SURNAME\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '中文姓|中文姓',
  \`GIVEN_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '英文名|英文名',
  \`SURNAME\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '英文姓|英文姓',
  \`NATION\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '民族|民族',
  \`RACE\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '种族|种族--预留字段，暂时不用',
  \`SURNAME_FIRST\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '是否姓在前|是否姓在前|Y-是,N-否',
  \`MARITAL_STATUS\` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '婚姻状况|婚姻状况|D-离婚,M-已婚,S-单身,W-丧偶,U-未说明婚姻状况',
  \`SEX\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '性别|性别|M-男,F-女',
  \`MAIDEN_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '婚前名|婚前名',
  \`OCCUPATION_CODE\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '职业|职业',
  \`MAX_DEGREE\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '最高学位|最高学位',
  \`EDUCATION\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '教育程度编号|教育程度编号',
  \`SALUTATION\` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '称呼|称呼',
  \`PLACE_OF_BIRTH\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '出生国|出生国',
  \`RESIDENT_TYPE\` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '居住类型|居住类型|1-自置,2-按揭,3-亲属楼宇,4-集体宿舍,5-租房,6-共有住宅,7-其他,9-未知,11-自有,12-借住',
  \`RESIDENT_STATUS\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '居住状态|居住状态|C-居民,N-非居民,P-原主民,O-其他',
  \`HOBBY\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '兴趣爱好|兴趣爱好',
  \`POST\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '职务|职务',
  \`QUALIFICATION\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '专业职称|专业职称|0-无 , 1-初级, 2-中级, 3-高级, 9-未知',
  \`MOTHERS_MAIDEN_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '母亲婚前名|母亲婚前名',
  \`SALARY_ACCT_BRANCH\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '工资账户开户行|工资账户开户行',
  \`SALARY_ACCT_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '工资账号|工资账号',
  \`INC_PROOF_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '收入验证人|收入验证人',
  \`REDCROSS_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '红十字会员编号|红十字会员编号',
  \`INC_PROOF_IND\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '收入验证标识|收入验证标识|Y-是 ,N-否',
  \`INC_PROOF_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '收入验证日期|收入验证日期',
  \`SALARY_CCY\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '薪资币种|薪资币种',
  \`MON_SALARY\` decimal(17, 2) NULL DEFAULT NULL COMMENT '月薪|月收入',
  \`YEARLY_INCOME\` decimal(17, 2) NULL DEFAULT NULL COMMENT '年收入|年收入',
  \`MORTGAGE_CCY\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '抵押币种|抵押币种',
  \`RENTAL_CCY\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '租金币种|租金币种',
  \`MON_MORTGAGE\` decimal(17, 2) NULL DEFAULT NULL COMMENT '月抵押付给金额|月抵押付给金额',
  \`MON_RENTAL\` decimal(17, 2) NULL DEFAULT NULL COMMENT '月租金|月租金',
  \`RESIDENT_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '入住日期|入住日期',
  \`CHILD_NUM\` int(0) NULL DEFAULT NULL COMMENT '孩子人数|孩子人数',
  \`DEPENDENT_NUM\` int(0) NULL DEFAULT NULL COMMENT '供养人数|供养人数',
  \`EMPLOYER_INDUSTRY\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '雇主所在行业|雇主所在行业',
  \`EMPLOYER_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '工作单位|雇主名称',
  \`EMPLOYMENT_START_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '雇佣开始日期|雇佣开始日期',
  \`SOCIAL_INSU_NO\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '社会保险号|社会保险号',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`LAST_CHANGE_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '最后修改日期|最后修改日期',
  \`LAST_CHANGE_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '最后修改柜员|最后修改柜员',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  \`BIRTH_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '出生日期|出生日期',
  PRIMARY KEY (\`CLIENT_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '个人客户信息表|个人客户信息表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_information
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_information\`;
CREATE TABLE \`cif_client_information\`  (
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`CLIENT_FULL_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户全名称|客户全名称',
  \`SWIFT_NAME\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '贸易金融名称|贸易金融名称',
  \`A_BASE_RATIO\` decimal(5, 2) NULL DEFAULT NULL COMMENT '借贷双方异常基准 |借贷双方异常基准 ',
  \`INVEST_SERVICE_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '投资服务同意书标志|投资服务同意书标志\r\n',
  \`PCP_GROUP_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '资金池账户组ID|资金池账户组ID',
  \`GROUP_NAME\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '账户组名称|账户组名称',
  \`ACCT_EXEC_CODE\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户经理代码|客户经理代码',
  \`RAINTG\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '评级结果|评级结果',
  \`MANAGE_CONTENT\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '监管内容|监管内容',
  \`FTF_FLAG\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '个人非居民标志|个人非居民标志，账号规则前缀',
  \`INTRA_GROUP_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '跨群组标志|跨群组标志\r\n',
  \`SPECIAL_RATE_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '特殊利率|AMCM特殊利率\r\n',
  \`AREA_NAME\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '区域名称|区域名称',
  \`MODE_OF_INFORMATION\` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '经营模式|经营模式\r\n',
  \`FORM_OF_COMPANY\` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '公司形式|公司形式\r\n',
  \`CON_OF_SUPPLE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '供应商集中度|供应商集中度\r\n',
  \`CON_OF_CUST\` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户集中度|客户集中度\r\n',
  \`START_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '开始日期|开始日期',
  \`ONLINE_SETTLE_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '线上清算标志\r\n|判断是否进行线上清算\r\n| Y-是,N-否',
  \`LIA_INDICATOR_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '诉讼标志|诉讼标志\r\n',
  \`TEL_CHECKER_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '恐怖组织标志|恐怖组织标志\r\n',
  \`CORE_MARKET_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '核心市场参与者|核心市场参与者\r\n',
  \`CONTRA_TYPE\` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '对手方类型|对手方类型\r\n',
  \`NAME_OF_EXCHANGE\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易所名称|交易所名称\r\n',
  \`NUMBER_OF_BRANCH\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '分行数量|分行数量\r\n',
  \`EXT_RATING_NORMAL\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '外部评级标普|外部评级 - 标普\r\n',
  \`EXT_RATING_MOD\` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '外部评级穆迪|外部评级 - 穆迪',
  \`INNER_RAINTG\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '内部评级|内部评级\r\n',
  \`SOC_TYPE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '主权类型|主权类型\r\n',
  \`GOVERNMENT_RE\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '政府关联标志|政府关联标志\r\n',
  \`ORIGINAL_START\` decimal(17, 2) NULL DEFAULT NULL COMMENT '初始违约概率|初始违约概率\r\n',
  \`ORIGINAL\` decimal(17, 2) NULL DEFAULT NULL COMMENT '违约概率|违约概率',
  \`PLACE_OF_OPERATION\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '业务开展地|业务开展地\r\n',
  \`PLACE_WHERE_BUSI\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '业务建立地|业务建立地\r\n',
  \`BUSINESS_PARTNER\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '业务合作伙伴|业务合作伙伴/交易对手\r\n',
  \`COUNTRY_CODE\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '国家代码|国家代码',
  \`BLANK_SHARE\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '不记名股票|不记名股票\r\n',
  \`THREE_OR_LAYER\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '三层或三层以上股权结构|三层或三层以上股权结构\r\n',
  \`COMPANY_OWN_INDIVIDUAL\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '由个人全资拥有的公司|由个人全资拥有的公司',
  \`CORPORATE_SHARE\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '拥有海外个人公司股东的本地公司|拥有海外个人/公司股东的本地公司\r\n',
  \`OWNERSHIP_STRUCTURE\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '涉及三个或三个以上注册地的所有权结构|涉及三个或三个以上注册地的所有权结构\r\n',
  \`TRUST_IN_UNCHAIN\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '所有权链中的信托|所有权链中的信托\r\n',
  \`FOR_IN_UNCHAIN\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '所有权链中的基金会|所有权链中的基金会\r\n',
  \`UNRES_INVEST_FUND\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '不受监管的投资基金|不受监管的投资基金\r\n',
  \`SHARED_UNCHAIN\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '所有权链中的提名股东|所有权链中的提名股东\r\n',
  \`DIRECT_UNCHAIN\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '所有权链中提名董事|所有权链中提名董事\r\n',
  \`CLIENT\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户|客户（开户：1-见证 2-中介 3-未出示ID）\r\n',
  \`NO_INTERFACE_CLIENT\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '非面对面客户|非面对面客户\r\n',
  \`CUSTOMER_DUE\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '经批准的中介机构介绍|经批准的中介机构介绍/BEA集团旗下/非旗下中介机构进行的客户尽职调查\r\n',
  \`CON_LENDING_PARTY\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联贷款方|关联贷款方\r\n',
  \`ORIGINAL_GRADE\` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '撒|sa\r\n',
  \`GUARANTY_ASSETS_CLASS\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '担保人资产等级|担保人资产等级\r\n',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易时间戳|交易时间戳',
  \`PEP_CLOSE\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '政治公众人物亲密合作方|政治公众人物亲密合作方',
  \`PEP_COUNTRY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '政治公众人物所在国家|政治公众人物所在国家',
  \`LAST_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '姓|姓\r\n',
  \`FIRST_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '名|名',
  \`PEP_RISK\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '政治任务风险|政治任务风险',
  \`EMPLOYER_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '员工标志|员工标志\r\n',
  \`MID_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '中间名|中间名\r\n',
  \`PEP_INTER\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '政治公众人物所在国际组织|政治公众人物所在国际组织',
  \`PEP_CATEGORY\` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '政治公众人物细类|政治公众人物细类',
  PRIMARY KEY (\`CLIENT_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '对公客户附属信息表|对公客户附属信息表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_joint_info
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_joint_info\`;
CREATE TABLE \`cif_client_joint_info\`  (
  \`DOCUMENT_ID\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '证件号码|证件号码',
  \`SEQ_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '序号|序号',
  \`MAIN_CLIENT_FLAG\` varchar(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '主客户标识|主客户标识|Y-是, N-否',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易时间戳|交易时间戳',
  \`JOINT_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '联名编号|联名客户/联名账户编号',
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`JOINT_CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '联名客户号|联名客户号',
  \`USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易柜员|交易柜员',
  \`VIRTUAL_CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '虚拟客户号|联名客户虚拟客户号',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  \`CLIENT_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户名称|联名客户名称',
  \`ISS_COUNTRY\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '发证国家|联名客户发证国家',
  \`DOCUMENT_TYPE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '证件类型|联名客户证件类型',
  PRIMARY KEY (\`SEQ_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '联名客户信息登记子表|虚拟客户信息登记子表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_joint_main
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_joint_main\`;
CREATE TABLE \`cif_client_joint_main\`  (
  \`VIRTUAL_CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '虚拟客户号|联名客户虚拟客户号',
  \`USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易柜员|交易柜员',
  \`JOINT_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '联名编号|联名客户/联名账户编号',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  \`JOINT_TYPE\` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '联名类型|联名类型。A-AND，金融交易时需要验证所有联名客户的密码；O-OR，金融交易时只验证任意一名联名客户的密码|A-AND,O-OR',
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易时间戳|交易时间戳',
  PRIMARY KEY (\`JOINT_NO\`, \`CLIENT_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '联名客户信息登记主表|虚拟客户信息登记主表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_level_list
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_level_list\`;
CREATE TABLE \`cif_client_level_list\`  (
  \`JOB_RUN_ID\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '批处理任务ID|批处理任务ID',
  \`BATCH_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '批次号|批次号',
  \`BATCH_STATUS\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '批次处理状态|批次处理状态|N-新建,V-已验证,W-待处理(部分成功),S-成功,F-失败',
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`CLIENT_LEVEL\` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户等级|客户等级',
  \`CLIENT_CHECK_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户检查标志|客户检查标志|Y-是,N-否',
  \`EXAMINE_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '可疑账户核实标志|可疑账户核实标志|1-待核实,2-已核实,3-核实未通过',
  \`CLIENT_LEVEL_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '客户等级更新日期|客户等级更新日期',
  \`ACCT_SOURCE_TYPE\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '账户来源类型|账户来源类型|H-核心,C-信用卡,Z-直销银行',
  \`ADD_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '添加标识|添加标识 黑名单推送外围标志|1-增加,2-减少',
  \`EXAMINE_TELLER\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '检查柜面|检查柜面',
  \`CLIENT_CHECK_TIME\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户检查时间|检查时间',
  \`PUSH_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '推送标志|推送标志|Y-是,N-否',
  \`ASYN_ID\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '异步编号|异步编号',
  \`ASYN_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '同步日期|同步日期',
  \`REMARK1\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '备注1|备注1',
  \`REMARK2\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '备注2|备注2',
  \`REMARK3\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '备注3|备注3',
  \`ERROR_CODE\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '错误码|错误码',
  \`ERROR_DESC\` varchar(2000) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '错误描述|错误描述',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`BATCH_NO\`, \`CLIENT_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户等级批次表|客户等级批次表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_nature
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_nature\`;
CREATE TABLE \`cif_client_nature\`  (
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`CLIENT_NATURE\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户属性|客户属性',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`CLIENT_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户属性表|客户属性表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_nature_def
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_nature_def\`;
CREATE TABLE \`cif_client_nature_def\`  (
  \`CLIENT_NATURE\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户属性|客户属性',
  \`CLIENT_NATURE_DESC\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户属性描述|类型描述',
  \`LOSS_IND\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '损失标志|损失标志|Y-损失 ,N-非损失',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`CLIENT_NATURE\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户属性定义表|客户属性定义表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_nra
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_nra\`;
CREATE TABLE \`cif_client_nra\`  (
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`SELF_STATEMENT\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '取得自证声明标志|是否取得自证声明|Y-是 ,N-否',
  \`NEG_NON_FIN_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '消极非金融标识|消极非金融标识|Y-是,N-否',
  \`IDENTIFY_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '是否免于识别|是否免于识别|Y-是,N-否',
  \`NRA_ID_TAX\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '非居民纳税人识别号|非居民纳税人识别号',
  \`NRA_ID_TAX_RES\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '非居民未提供纳税人识别号原因|非居民未提供纳税人识别号原因|1-居民国（地区）不发放纳税人识别号 ,2-账户持有人未能取得纳税识别号',
  \`CON_ID_TAX\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '控制人纳税人识别号  |控制人纳税人识别号',
  \`CON_ID_TAX_RES\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '控制人纳税人识别原因  |控制人纳税人识别原因',
  \`CON_RESIDENT_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '控制人居民标识 |控制人居民标识|1-中国税收居民,2-非居民,3-既是中国税收居民又是其他国家（地区）税收居民',
  \`CON_NAME_CH\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '控制人姓名（中文） |控制人姓名（中文）',
  \`CON_NAME_EN\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '控制人姓名（英文） |控制人姓名（英文）',
  \`CON_BITRHDAY\` datetime(0) NULL DEFAULT NULL COMMENT '控制人出生日期  |控制人出生日期',
  \`CON_BIRTH_CH\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '控制人出生地（中文）  |控制人出生地（中文）',
  \`CON_BIRTH_EN\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '控制人出生地（英文）  |控制人出生地（英文）',
  \`CON_COUNTRY\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '控制人居民国（地区）  |控制人居民国（地区）',
  \`CON_NOW_ADDRESS_CH\` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '控制人现居地址（中文）  |控制人现居地址（中文）',
  \`CON_NOW_ADDRESS_EN\` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '控制人现居地址（英文）  |控制人现居地址（英文）',
  \`RESIDENT_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '居民标识|居民标识|Y-是 ,N-不是',
  \`NRA_BIRTH_CH\` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '非居民出生地（中文）|非居民出生地（中文）',
  \`NRA_BIRTH_EN\` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '非居民出生地（英文）|非居民出生地（英文）',
  \`NRA_COUNTRY\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '非居民居民国（地区）|非居民居民国（地区）',
  \`NRA_NOW_ADDRESS_CH\` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '非居民现居地址（中文）|非居民现居地址（中文）',
  \`NRA_NOW_ADDRESS_EN\` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '非居民现居地址（英文）|非居民现居地址（英文）',
  \`NRA_BITRHDAY\` datetime(0) NULL DEFAULT NULL COMMENT '非居民出生日期|非居民出生日期',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`CLIENT_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '非居民金融账户涉税信息表|非居民金融账户涉税信息NON_RESIDENTACCOUNT1、在建立或维护客户信息时，则给该表插入数据。' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_nra_detail
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_nra_detail\`;
CREATE TABLE \`cif_client_nra_detail\`  (
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`NRA_COUNTRY\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '非居民居民国（地区）|非居民居民国（地区）',
  \`NRA_ID_TAX\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '非居民纳税人识别号|非居民纳税人识别号',
  \`NRA_ID_TAX_DETRES\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '未取得纳税人识别号具体原因|未取得纳税人识别号具体原因',
  \`NRA_ID_TAX_RES\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '非居民未提供纳税人识别号原因|非居民未提供纳税人识别号原因|1-居民国（地区）不发放纳税人识别号 ,2-账户持有人未能取得纳税识别号',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`CLIENT_NO\`, \`NRA_COUNTRY\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '非居民金融账户涉税信息详细信息表|非居民金融账户涉税信息详细信息表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_rate
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_rate\`;
CREATE TABLE \`cif_client_rate\`  (
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`RAINTG_ORG\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '评级机构|评级机构',
  \`RAINTG_TYPE\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '评级类型|评级类型|N-内部评级  ,W-外部评级',
  \`RAINTG_EFFE_DATE\` datetime(0) NOT NULL COMMENT '评级生效日期|评级生效日期',
  \`RAINTG_MAT_DATE\` datetime(0) NOT NULL COMMENT '评级到期日期|评级到期日期',
  \`RAINTG\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '评级结果|评级结果',
  \`RATING_STATUS\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '评级状态|评级状态|0-有效,1-无效',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`CLIENT_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户评级信息表|客户评级信息表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_relate_info_hsbc
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_relate_info_hsbc\`;
CREATE TABLE \`cif_client_relate_info_hsbc\`  (
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`GIMIS_CUSTOMER_INDICATOR\` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT 'GIMIS客户标识|GIMIS客户标识',
  \`ADVICE_REQUIRED_CODE\` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '通知代码|通知代码',
  \`MARKET_SECTOR1\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '市场部门1|市场部门1',
  \`MARKET_SECTOR_PROPORTION1\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '市场部门1比例|市场部门1比例',
  \`MARKET_SECTOR2\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '市场部门2|市场部门2',
  \`MARKET_SECTOR_PROPORTION2\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '市场部门2比例|市场部门2比例',
  \`MARKET_SECTOR3\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '市场部门3|市场部门3',
  \`MARKET_SECTOR_PROPORTION3\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '市场部门3比例|市场部门3比例',
  \`GIMIS_ATTRIBUTE1\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT 'GIMIS属性1|GIMIS属性1',
  \`GIMIS_ATTRIBUTE2\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT 'GIMIS属性2|GIMIS属性2',
  \`CENTRAL_BANK_CUSTOMER_CLASS\` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '央行客户分类|央行客户分类',
  \`CENTRAL_BANK_CUSTOMER_GROUP\` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '央行客户分组|央行客户分组',
  \`GHO_CUSTOMER_CLASS\` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '集团客户分类|集团客户分类',
  \`GHO_CUSTOMER_GROUP\` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '集团客户分组|集团客户分组',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易时间戳|交易时间戳',
  \`CBBK\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '代理银行编号|代理银行编号',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  \`CBBH\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '代理机构号|代理机构号',
  PRIMARY KEY (\`CLIENT_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户关联信息表|用于记录汇丰客户特有的关联信息' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_resident
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_resident\`;
CREATE TABLE \`cif_client_resident\`  (
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`TAXPAYER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '纳税人识别号|纳税人识别号',
  \`NO_TAXPAYER\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '无纳税人识别号|无纳税人识别号',
  \`REMARK1\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '备注1|备注1',
  \`REMARK2\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '备注2|备注2',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '法人|法人',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`FACILITY_JSON\` varchar(7000) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '海外账户税收合规法案信息大字段|海外账户税收合规法案信息大字段',
  PRIMARY KEY (\`CLIENT_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '海外账户税收合规法案信息表|海外账户税收合规法案信息表表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_restraints
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_restraints\`;
CREATE TABLE \`cif_client_restraints\`  (
  \`RES_SEQ_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '限制编号|限制编号',
  \`RESTRAINT_TYPE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '限制类型|限制类型',
  \`SOURCE_TYPE\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '渠道类型|渠道类型',
  \`TRAN_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '交易日期|交易日期',
  \`TRAN_BRANCH\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易机构|交易机构',
  \`MAINTAIN_TYPE\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '维护方式|维护方式|0-客户 ,1-行内',
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`START_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '开始日期|开始日期',
  \`TERM\` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '存期期限|存期',
  \`TERM_TYPE\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '期限类型|存期类型|Y-年,Q-季,M-月,W-周,D-日',
  \`END_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '结束日期|结束日期',
  \`RESTRAINTS_STATUS\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '限制状态|限制状态|A-已批准,E-已终止 ,F-未生效(限制开始日期未到，在将来的某天限制开始生效)',
  \`NARRATIVE\` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '摘要|开户时的账号用途，销户时的销户原因',
  \`USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易柜员|交易柜员',
  \`AUTH_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '授权柜员|授权柜员',
  \`LAST_CHANGE_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '最后修改日期|最后修改日期',
  \`LAST_CHANGE_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '最后修改柜员|最后修改柜员',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`RES_SEQ_NO\`) USING BTREE,
  INDEX \`IDX_CIF_CLIENT_RESTRAINTS_1M\`(\`RESTRAINTS_STATUS\`, \`CLIENT_NO\`, \`RESTRAINT_TYPE\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户限制表|客户限制表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_restraints_bak
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_restraints_bak\`;
CREATE TABLE \`cif_client_restraints_bak\`  (
  \`RES_SEQ_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '限制编号|限制编号',
  \`RESTRAINT_TYPE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '限制类型|限制类型',
  \`SOURCE_TYPE\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '渠道类型|渠道类型',
  \`TRAN_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '交易日期|交易日期',
  \`TRAN_BRANCH\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易机构|交易机构',
  \`MAINTAIN_TYPE\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '维护方式|维护方式|0-客户 ,1-行内',
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`START_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '开始日期|开始日期',
  \`TERM\` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '存期期限|期限',
  \`TERM_TYPE\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '期限类型|期限类型|Y-年,Q-季,M-月,W-周,D-日',
  \`END_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '结束日期|结束日期',
  \`RESTRAINTS_STATUS\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '限制状态|限制状态|A-已批准,E-已终止 ,F-未生效(限制开始日期未到，在将来的某天限制开始生效) ',
  \`NARRATIVE\` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '摘要|开户时的账号用途，销户时的销户原因',
  \`USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易柜员|交易柜员',
  \`AUTH_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '授权柜员|授权柜员',
  \`LAST_CHANGE_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '最后修改日期|最后修改日期',
  \`LAST_CHANGE_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '最后修改柜员|最后修改柜员',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  PRIMARY KEY (\`RES_SEQ_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户限制历史备份表|客户限制历史数据备份表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_restraints_hist
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_restraints_hist\`;
CREATE TABLE \`cif_client_restraints_hist\`  (
  \`SEQ_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '序号|序号',
  \`RES_SEQ_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '限制编号|限制编号',
  \`RESTRAINT_TYPE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '限制类型|限制类型',
  \`SOURCE_TYPE\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '渠道类型|渠道类型',
  \`TRAN_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '交易日期|交易日期',
  \`TRAN_BRANCH\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易机构|交易机构',
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`START_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '开始日期|开始日期',
  \`TERM\` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '存期期限|存期',
  \`TERM_TYPE\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '期限类型|存期类型|Y-年,Q-季,M-月,W-周,D-日',
  \`END_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '结束日期|结束日期',
  \`RESTRAINTS_STATUS\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '限制状态|限制状态|A-已批准,E-已终止 ,F-未生效(限制开始日期未到，在将来的某天限制开始生效)',
  \`LAST_STATUS\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '前一限制状态|前一限制状态|A-有效 ,E-失效 ,F-未生效',
  \`NARRATIVE\` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '摘要|开户时的账号用途，销户时的销户原因',
  \`USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易柜员|交易柜员',
  \`AUTH_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '授权柜员|授权柜员',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  \`MAINTAIN_TYPE\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '维护方式|维护方式|0-客户 ,1-行内',
  \`LAST_CHANGE_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '最后修改日期|最后修改日期',
  \`LAST_CHANGE_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '最后修改柜员|最后修改柜员',
  PRIMARY KEY (\`SEQ_NO\`, \`CLIENT_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户限制历史表|客户限制历史表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_risk_level_list
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_risk_level_list\`;
CREATE TABLE \`cif_client_risk_level_list\`  (
  \`BATCH_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '批次号|批次号',
  \`BATCH_STATUS\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '批次处理状态|批次处理状态|N-新建,V-已验证,W-待处理(部分成功),S-成功,F-失败',
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`FILE_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '文件日期|文件日期',
  \`FILE_PATH\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '文件路径|文件路径',
  \`LOCAL_FILE_PATH\` varchar(2000) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '本地文件路径|本地文件路径',
  \`UPDATE_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '更新日期|更新日期',
  \`RISK_LEVEL\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '风险等级|风险等级|H-高,L-低',
  \`RISK_WEIGHT\` int(0) NULL DEFAULT NULL COMMENT '风险权重|风险等级',
  \`ERROR_CODE\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '错误码|错误码',
  \`ERROR_DESC\` varchar(2000) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '错误描述|错误描述',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`BATCH_NO\`, \`CLIENT_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '反洗钱风险等级更新登记簿|反洗钱风险等级更新登记簿' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_shortmsg
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_shortmsg\`;
CREATE TABLE \`cif_client_shortmsg\`  (
  \`MSG_PARA_ID\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '短信提醒编号|短信提醒编号',
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`DOCUMENT_ID\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '证件号码|证件号码',
  \`DOCUMENT_TYPE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '证件类型|证件类型',
  \`MATURITY_DATE\` datetime(0) NOT NULL COMMENT '到期日期|证件的到期日期',
  \`PARA_START_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '短信发送开始日期|短信发送开始日期',
  \`NEXT_SEND_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '下一短信发送日期|下一短信发送日期',
  \`PARA_END_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '短信发送结束日期|短信发送结束日期',
  \`PARA_STATUS\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '短信状态|短信状态|A-有效 ,C-失效',
  \`SEND_TIMES\` int(0) NULL DEFAULT NULL COMMENT '短信已发送条数|短信已发送条数',
  \`LAST_CHANGE_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '最后修改日期|最后修改日期',
  \`LAST_CHANGE_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '最后修改柜员|最后修改柜员',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`MSG_PARA_ID\`, \`CLIENT_NO\`, \`MATURITY_DATE\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户短信提醒记录表|客户短信提醒记录表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_super_crop
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_super_crop\`;
CREATE TABLE \`cif_client_super_crop\`  (
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`SUPER_CROP_ACCT_CHECK_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '上级法人或主管单位基本存款账户开户许可证核准号|上级法人或主管单位基本存款账户开户许可证核准号',
  \`SUPER_NAME\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '上级法人或单位负责人姓名|上级法人或单位负责人姓名',
  \`SUPER_DOCUMENT_TYPE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '上级法人或单位负责人证件种类|上级法人或单位负责人证件种类',
  \`SUPER_DOCUMENT_ID\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '上级法人或单位负责人证件号码|上级法人或单位负责人证件号码',
  \`SUPER_DOC_EXPIRY_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '上级法人或单位负责人证件有效期|上级法人或单位负责人证件有效期',
  \`SUPER_CROP_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '上级法人或主管单位名称|上级法人或主管单位名称',
  \`SUPER_CROP_ORG_CODE\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '上级法人或主管单位组织机构代码|上级法人或主管单位组织机构代码',
  \`SUPER_CROP_DOC_EXPIRY_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '上级法人或主管单位证件有效期|上级法人或主管单位证件有效期',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`CLIENT_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '单位客户上级法人或主管单位信息表|单位客户上级法人或主管单位信息表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_type
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_type\`;
CREATE TABLE \`cif_client_type\`  (
  \`CLIENT_TYPE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户类型|客户大类，目前一般分为个人，公司，金融机构和内部客户。取之于CIF_CLIENT_TYPE.CLIENT_TYPE',
  \`CLIENT_TYPE_DESC\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户类型描述|客户类型描述',
  \`CLIENT_CLASS\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户类别|客户类别|PER-个人类，ERP-企业类，BRA-机构类',
  \`IS_INDIVIDUAL\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '个体客户标志|是否个体客户|Y-是,N-否',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`CLIENT_TYPE\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户类型-大类表|客户类型-大类表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_used_info
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_used_info\`;
CREATE TABLE \`cif_client_used_info\`  (
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`USED_INFO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '曾用信息|曾用信息',
  \`BEFORE_DOCUMENT_ID\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '变更前的法人证件号|变更前的法人证件号',
  \`BEFORE_DOCUMENT_TYPE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '变更前证件类型|变更前的法人证件类型',
  \`LAST_CHANGE_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '最后修改日期|最后修改日期',
  \`LAST_CHANGE_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '最后修改柜员|最后修改柜员',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`CLIENT_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户曾用名曾用证件信息表|客户曾用名曾用证件信息表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_client_verification
-- ----------------------------
DROP TABLE IF EXISTS \`cif_client_verification\`;
CREATE TABLE \`cif_client_verification\`  (
  \`JOB_RUN_ID\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '批处理任务ID|批处理任务ID',
  \`BATCH_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '批次号|批次号',
  \`SEQ_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '序号|序号',
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`VERIFICATION_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '核实日期|核实日期',
  \`VERIFICATION_BRANCH\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '核查机构|核查机构',
  \`VERIFICATION_SOURCE_TYPE\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '核查渠道|核查渠道',
  \`VERIFICATION_RESULT\` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '核查结果|核查结果|01-未核实 ,02-真实 ,03-虚假 ,04-假名 ,05-匿名 ,06-无法核实 ,07-在有疑义时销户',
  \`VERIFICATION_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '核实柜员|核实柜员',
  \`VERIFY_STATUS\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '核查状态|核查状态|A-有效 ,F-无效',
  \`UNVERIFICATION_REASON\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '无法核实原因|无法核实原因',
  \`IS_SAVE\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '留存标志|是否留存|Y-是 ,N-否',
  \`TREATMENT\` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '处置方式|处置方式|01-未做处理,02-报告反洗钱部门,03-报告公安机关,04-报告人民银行,05-中止交易,06-关闭网银,07-关闭手机银行,08-关闭ATM取现,09-关闭ATM转账,10-其他',
  \`REMARK\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '备注|备注',
  \`RET_CODE\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '状态码|状态码',
  \`RET_MSG\` varchar(2000) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '服务状态描述|服务状态描述',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`CLIENT_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '个人客户身份核实情况表|个人客户身份核实情况表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_contact_list
-- ----------------------------
DROP TABLE IF EXISTS \`cif_contact_list\`;
CREATE TABLE \`cif_contact_list\`  (
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`LINKMAN_TYPE\` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '联系人类型|联系人类型|HL-热线验证人,CA-对账有权人,FC-金融交易经办人',
  \`LINKMAN_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '联系人名称|联系人名称',
  \`DOCUMENT_ID\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '证件号码|证件号码',
  \`DOCUMENT_TYPE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '证件类型|证件类型',
  \`PHONE_NO1\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '电话号码 1|电话号码 1',
  \`PHONE_NO2\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '联系人电话2|联系人电话2',
  \`LAST_CHANGE_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '最后修改日期|最后修改日期',
  \`LAST_CHANGE_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '最后修改柜员|最后修改柜员',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`CLIENT_NO\`, \`LINKMAN_TYPE\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户联系人表|客户联系人表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_contact_type
-- ----------------------------
DROP TABLE IF EXISTS \`cif_contact_type\`;
CREATE TABLE \`cif_contact_type\`  (
  \`CONTACT_TYPE\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '联系类型|联系类型',
  \`CONTACT_TYPE_DESC\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '联系类型描述 |联系类型描述',
  \`ROUTE\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '联系方式类型|联系方式类型|SWIFT-SWIFT电文,POSTAL-邮寄',
  \`SWIFT_ID\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '银行国际代码|银行国际代码',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`CONTACT_TYPE\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '联系类型表|联系类型表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_control_contact
-- ----------------------------
DROP TABLE IF EXISTS \`cif_control_contact\`;
CREATE TABLE \`cif_control_contact\`  (
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`CONTACT_ADDRESS_TYPE\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '联系地址类型 |联系地址类型|1-出生地,2-现居住地',
  \`CONTACT_TEL\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '联系电话  |联系电话',
  \`COUNTRY\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '国家|国家',
  \`STATE\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '省别代码|省、州',
  \`CITY\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '城市|城市',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`CLIENT_NO\`, \`CONTACT_ADDRESS_TYPE\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '控制人税收居民联系表|控制人税收居民联系表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_cr_rating
-- ----------------------------
DROP TABLE IF EXISTS \`cif_cr_rating\`;
CREATE TABLE \`cif_cr_rating\`  (
  \`CR_RATING\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户信用等级|客户等级 客户信用等级|001-1级,002-2级,003-3级,004-4级',
  \`CR_RATING_DESC\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '信用等级描述|信用等级描述',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`CR_RATING\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '信用等级表|信用等级表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_crop_compnay_info
-- ----------------------------
DROP TABLE IF EXISTS \`cif_crop_compnay_info\`;
CREATE TABLE \`cif_crop_compnay_info\`  (
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`COMPNAY_GOVERNOR\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '法人/财务主管 |法人/财务主管',
  \`COMPANY_GOVERNOR_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人/财务主管名称 |法人/财务主管名称',
  \`DOCUMENT_ID\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '证件号码|证件号码',
  \`DOCUMENT_TYPE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '证件类型|证件类型',
  \`MATURITY_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '到期日期|证件的到期日期',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`CLIENT_NO\`, \`COMPNAY_GOVERNOR\`) USING BTREE,
  INDEX \`IDX_CIF_CROP_COMPNAY_INFO_1\`(\`COMPNAY_GOVERNOR\`, \`CLIENT_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '法人/财务主管详细信息表|法人/财务主管详细信息表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_cross_relations
-- ----------------------------
DROP TABLE IF EXISTS \`cif_cross_relations\`;
CREATE TABLE \`cif_cross_relations\`  (
  \`CLIENT_A\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户A|客户A',
  \`CLIENT_B\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户B|客户B',
  \`RELATION_TYPE\` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '关系类型|关系类型|FQ-夫妻,HK-共同还款人,JT-集团总公司,ZG-集团子公司',
  \`INVERSE_RELA_TYPE\` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '反向关系类型|反向关系类型|FQ-夫妻,HK-共同还款人,JT-集团总公司,ZG-集团子公司',
  \`INVERSE_RELA_DESC\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '反向关系描述|反向关系描述',
  \`CREATE_DATE\` datetime(0) NOT NULL COMMENT '创建日期|创建日期',
  \`RELATION_STATUS\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关系状态|状态|A-正常,C-关闭',
  \`CLIENT_KEY\` bigint(0) NULL DEFAULT NULL COMMENT '关系客户内部键|系统内部用来作为客户的登记的唯一标识',
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号，没有实际意义，赋值CLIENT_A',
  \`CLIENT_SHORT\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户简称|客户简称',
  \`APPROVE_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '批准日期|批准日期',
  \`DECLARE_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '宣告日期|宣告日期',
  \`RELA_TYPE\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联方类型|关联方类型|1-个人,2-企业',
  \`RELA_DOCUMENT_TYPE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联方证件类型|关联方证件类型',
  \`RELA_DOCUMENT_ID\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联方证件号|关联方证件号',
  \`RELA_BIRTH_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '关联方出生日期|关联方如果是个人，此处为关联方出生日期',
  \`RE_CLIENT_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联方中文名称|关联方中文名称',
  \`RE_EN_CLIENT_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联方英文名称|关联方英文名称',
  \`RELA_SEX\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联方性别|关联方如果是个人，此处为关联方性别|M-男,F-女 ,U-未知',
  \`RELA_COUNTRY\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联方国籍|关联方国籍',
  \`RELA_EDUCATION\` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联方学历|关联方如果是个人，此处为关联方最高学历',
  \`RELA_TEL\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联方联系电话|关联方联系电话',
  \`RELA_EMPLOYER_ADR\` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联方单位地址|关联方如果是个人，此处为关联方所在单位地址',
  \`RELA_EMPLOYER_NM\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联方单位名称|关联方如果是个人，此处为关联方所在单位名称',
  \`RELA_EMPLOYER_TEL\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联方单位电话|关联方如果是个人，此处为关联方所在单位电话',
  \`RELA_ORG_CODE\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联方组织机构代码|关联方如果是企业，则此处为企业的组织机构代码',
  \`RELA_REG_CODE\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联方登记注册代码|关联方如果是企业，则此处为企业的登记注册代码',
  \`RELA_CREDIT_CODE\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联方信用代码|关联方如果是企业，则此处为企业的机构信用代码',
  \`RELA_LOAN_CARD\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联方贷款编号|关联方如果是企业，则此处为企业的贷款卡编码',
  \`ASSESS_NETVAL_CCY\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '评定净值币种|评定净值币种',
  \`EVAL_NETVAL\` decimal(17, 2) NULL DEFAULT NULL COMMENT '估价净值|估价净值',
  \`EVAL_NETVAL_CCY\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '估价净值币种|估价净值币种',
  \`NOTICE_NETVAL\` decimal(17, 2) NULL DEFAULT NULL COMMENT '公告净值|公告净值',
  \`NOTICE_NETVAL_CCY\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '公告净值币种|公告净值币种',
  \`ASSESS_NETVAL\` decimal(17, 2) NULL DEFAULT NULL COMMENT '评定净值|评定净值',
  \`EQUITY_PERCENT\` decimal(5, 2) NULL DEFAULT NULL COMMENT '企业占股比例|关联方如果是企业，则此处为企业的占股比例',
  \`CLOSED_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '关闭日期|关闭日期',
  \`CREATION_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '创建柜员|创建柜员',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`LAST_CHANGE_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '最后修改日期|最后修改日期',
  \`LAST_CHANGE_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '最后修改柜员|最后修改柜员',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`CLIENT_A\`, \`CLIENT_B\`, \`RELATION_TYPE\`, \`CLIENT_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户关系表|客户关系表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_cross_relations_hist
-- ----------------------------
DROP TABLE IF EXISTS \`cif_cross_relations_hist\`;
CREATE TABLE \`cif_cross_relations_hist\`  (
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`RELATION_TYPE\` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关系类型|关系类型|FQ-夫妻,HK-共同还款人,JT-集团总公司,ZG-集团子公司',
  \`CLIENT_A\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户A|客户A',
  \`CLIENT_B\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户B|客户B',
  \`TRAN_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '交易日期|交易日期',
  \`CREATE_DATE\` datetime(0) NOT NULL COMMENT '创建日期|创建日期',
  \`CREATION_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '创建柜员|创建柜员',
  \`APPROVE_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '批准日期|批准日期',
  \`DECLARE_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '宣告日期|宣告日期',
  \`INVERSE_RELA_TYPE\` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '反向关系类型|反向关系类型|FQ-夫妻,HK-共同还款人,JT-集团总公司,ZG-集团子公司',
  \`INVERSE_RELA_DESC\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '反向关系描述|反向关系描述',
  \`RELATION_STATUS\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关系状态|状态|A-正常,C-关闭',
  \`CLOSED_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '关闭日期|关闭日期',
  \`ASSESS_NETVAL_CCY\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '评定净值币种|评定净值币种',
  \`ASSESS_NETVAL\` decimal(17, 2) NULL DEFAULT NULL COMMENT '评定净值|评定净值',
  \`EVAL_NETVAL\` decimal(17, 2) NULL DEFAULT NULL COMMENT '估价净值|估价净值',
  \`EVAL_NETVAL_CCY\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '估价净值币种|估价净值币种',
  \`NOTICE_NETVAL\` decimal(17, 2) NULL DEFAULT NULL COMMENT '公告净值|公告净值',
  \`NOTICE_NETVAL_CCY\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '公告净值币种|公告净值币种',
  \`EQUITY_PERCENT\` decimal(5, 2) NULL DEFAULT NULL COMMENT '企业占股比例|关联方如果是企业，则此处为企业的占股比例',
  \`RELA_DOCUMENT_TYPE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联方证件类型|关联方证件类型',
  \`RELA_TYPE\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联方类型|关联方类型|1-个人,2-企业',
  \`RELA_SEX\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联方性别|关联方如果是个人，此处为关联方性别|M-男,F-女 ,U-未知',
  \`CLIENT_SHORT\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户简称|客户简称',
  \`CLIENT_KEY\` bigint(0) NULL DEFAULT NULL COMMENT '关系客户内部键|系统内部用来作为客户的登记的唯一标识',
  \`RELA_TEL\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联方联系电话|关联方联系电话',
  \`RE_CLIENT_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联方中文名称|关联方中文名称',
  \`RE_EN_CLIENT_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联方英文名称|关联方英文名称',
  \`RELA_BIRTH_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '关联方出生日期|关联方如果是个人，此处为关联方出生日期',
  \`RELA_DOCUMENT_ID\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联方证件号|关联方证件号',
  \`RELA_EDUCATION\` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联方学历|关联方如果是个人，此处为关联方最高学历',
  \`RELA_COUNTRY\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联方国籍|关联方国籍',
  \`RELA_CREDIT_CODE\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联方信用代码|关联方如果是企业，则此处为企业的机构信用代码',
  \`RELA_EMPLOYER_ADR\` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联方单位地址|关联方如果是个人，此处为关联方所在单位地址',
  \`RELA_EMPLOYER_NM\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联方单位名称|关联方如果是个人，此处为关联方所在单位名称',
  \`RELA_EMPLOYER_TEL\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联方单位电话|关联方如果是个人，此处为关联方所在单位电话',
  \`RELA_ORG_CODE\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联方组织机构代码|关联方如果是企业，则此处为企业的组织机构代码',
  \`RELA_REG_CODE\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联方登记注册代码|关联方如果是企业，则此处为企业的登记注册代码',
  \`RELA_LOAN_CARD\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关联方贷款编号|关联方如果是企业，则此处为企业的贷款卡编码',
  \`ACTION\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '维护类型|维护类型|I-INSERT,U-UPDATE',
  \`USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易柜员|交易柜员',
  \`LAST_CHANGE_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '最后修改日期|最后修改日期',
  \`LAST_CHANGE_USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '最后修改柜员|最后修改柜员',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`CLIENT_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户关系历史表|客户关系历史表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_define_column_information
-- ----------------------------
DROP TABLE IF EXISTS \`cif_define_column_information\`;
CREATE TABLE \`cif_define_column_information\`  (
  \`ATTR_VALUE\` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '属性值|属性值',
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`ATTR_KEY\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '参数KEY值|参数KEY值',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  \`USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易柜员|交易柜员',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易时间戳|交易时间戳',
  PRIMARY KEY (\`CLIENT_NO\`, \`ATTR_KEY\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '自定义客户信息表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_document_exp
-- ----------------------------
DROP TABLE IF EXISTS \`cif_document_exp\`;
CREATE TABLE \`cif_document_exp\`  (
  \`DOCUMENT_TYPE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '证件类型|证件类型',
  \`DAYS_BEFORE_RES\` int(0) NULL DEFAULT NULL COMMENT '证件到期前天数|证件到期前此天数内，系统默认在联机交易进行提醒',
  \`DAYS_AFTER_CTRL\` int(0) NULL DEFAULT NULL COMMENT '证件到期后天数配置渠道控制|证件到期此天数后，增加客户渠道控制',
  \`SOURCE_TYPE_RULE\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '渠道类型配置值|要增加的客户渠道控制类型，暂未使用，系统目前固定使用暂停非柜面渠道控制类型',
  \`DAYS_AFTER_RES\` int(0) NULL DEFAULT NULL COMMENT '证件到期后天数配置客户级限制|证件到期此天数后，增加客户限制',
  \`RESTRAINT_TYPE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '限制类型|要增加的客户限制类型',
  \`STOP_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '止付标志|当此字段配置为Y时，才会在证件到期后增加客户限制|Y-是,N-否',
  \`DEAL_FLOW\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '处理方式|证件到期后的联机接口处理方式，只要证件已到期就按此配置处理|A-授权处理,B-拒绝处理,D-提醒处理,O-开放',
  \`MSG_PARA_ID\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '短信提醒编号|客户证件到期，日终批处理使用此短信模板给客户发送客户证件到期短信',
  \`CLIENT_RES_PARA_ID\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '客户限制提醒编号|客户证件到期要增加客户限制，日终批处理使用此短信模板给客户发送客户限制短信',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`DOCUMENT_TYPE\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '证件到期管理表|证件到期管理表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_dropdown_parameter
-- ----------------------------
DROP TABLE IF EXISTS \`cif_dropdown_parameter\`;
CREATE TABLE \`cif_dropdown_parameter\`  (
  \`TABLE_NAME\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '表名|表名',
  \`SQL_ID\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT 'sql编号|sql编号',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易时间戳|交易时间戳',
  PRIMARY KEY (\`TABLE_NAME\`, \`SQL_ID\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '参数配置表|CIF模块下拉列表参数表，用于前端下拉列表查询配置参数' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_education
-- ----------------------------
DROP TABLE IF EXISTS \`cif_education\`;
CREATE TABLE \`cif_education\`  (
  \`EDUCATION\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '教育程度编号|教育程度编号',
  \`EDUCATION_DESC\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '教育程度描述|教育程度描述',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`EDUCATION\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '教育程度表|教育程度表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_foreign_cer
-- ----------------------------
DROP TABLE IF EXISTS \`cif_foreign_cer\`;
CREATE TABLE \`cif_foreign_cer\`  (
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`TAX_COUNTRY\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '税收居民国|税收居民国',
  \`TAX_GOVERNMENT\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '税务分类制度|税务分类制度',
  \`EIN_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '系统编号|ein系统编号',
  \`CCY\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '币种|币种',
  \`TAX_STATUS\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '税务分类状况|税务分类状况',
  \`BALANCE_THRESHOLD\` bigint(0) NULL DEFAULT NULL COMMENT '补救平衡阈值|补救平衡阈值',
  \`ANNUAL_THRESHOLD\` bigint(0) NULL DEFAULT NULL COMMENT '年度重分类阈值|年度重分类阈值',
  \`TAX_RESIDENT_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '税收居民标识|税收居民标识|1-中国税收居民,2-非居民,3-既是中国税收居民又是其他国家（地区）税收居民',
  \`AREA\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '国家地区|国家地区',
  \`PROVINCE\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '省|省',
  \`CITY\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '城市|城市',
  \`HOME_ADDR\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '居住地址|居住地址',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '法人|法人',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`JSON_PEOPLE\` varchar(7000) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '个人信息大字段|个人信息大字段',
  \`JSON_CONTROL\` varchar(7000) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '实际控制人信息大字段|实际控制人信息大字段',
  \`JSON_BRANCH\` varchar(7000) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '机构信息大字段|机构信息大字段',
  PRIMARY KEY (\`CLIENT_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户FATCA和CRS信息表|客户FATCA和CRS信息表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_industry
-- ----------------------------
DROP TABLE IF EXISTS \`cif_industry\`;
CREATE TABLE \`cif_industry\`  (
  \`INDUSTRY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '通用行业代码|通用行业代码',
  \`DETAIL_IND\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '是否明细代码|是否明细代码|Y-是 ,N-否',
  \`INDUSTRY_DESC\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '通用行业代码描述|通用行业代码描述',
  \`INDUSTRY_LEVEL\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '通用行业层级|通用行业层级|1-一级 ,2-二级 ,3-三级 ,4-四级',
  \`PARENT_INDUSTRY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '上级通用行业代码|上级通用行业代码',
  \`RISK_LEVEL\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '风险等级|风险等级|H-高,L-低',
  \`STANDARD_IND\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '是否国际代码|是否国际代码|Y-是 ,N-否',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`INDUSTRY\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '通用行业代码表|通用行业代码表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_merchant_type_def
-- ----------------------------
DROP TABLE IF EXISTS \`cif_merchant_type_def\`;
CREATE TABLE \`cif_merchant_type_def\`  (
  \`CC_SUB_TYPE\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '商户类型|商户类型',
  \`CC_SUB_TYPE_DESC\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '商户类型说明|商户类型说明',
  \`MERCHAN_GENERA\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '商户大类|商户大类',
  \`MERCHAN_GENERA_DESC\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '商户大类说明|商户大类说明',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`CC_SUB_TYPE\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '商户类型定义表|商户类型定义表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_occupation
-- ----------------------------
DROP TABLE IF EXISTS \`cif_occupation\`;
CREATE TABLE \`cif_occupation\`  (
  \`OCCUPATION_CODE\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '职业|职业',
  \`OCCUPATION_DESC\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '职业说明|职业说明',
  \`RISK_LEVEL\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '风险等级|风险等级|H-高,L-低',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`OCCUPATION_CODE\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '职业分类表|职业分类表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_oper_program_config
-- ----------------------------
DROP TABLE IF EXISTS \`cif_oper_program_config\`;
CREATE TABLE \`cif_oper_program_config\`  (
  \`CLIENT_OPERATE_TYPE\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '限制/开放类型 |限制/开放类型|INFO_LACK-客户资料不全检查提醒,ID_CARD_EXPIRY-证件到期客户（临时身份证及户口簿16周岁到期阻止）,ID_CARD_EXPIRYREMIND-证件到期前30天及后180天提醒',
  \`DEAL_FLOW\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '处理方式|处理方式|A-授权处理,B-拒绝处理,D-提醒处理,O-开放',
  \`RELA_PROGRAM_ID\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '限制/开放的交易号|限制/开放的交易号(逗号隔开各交易号)',
  \`CLIENT_OPERATE_TYPE_DESC\` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '限制/开放类型描述|用来描述是校验哪种数据，1、当optionType=INFO_LACK 时，客户资料不全检查提醒 配合 dealFlow = D；2、当optionType = ID_CARD_EXPIRY 时，证件到期客户（临时身份证及户口簿16周岁到期阻止）配合 dealFlow = B；3、当optionType = ID_CARD_EXPIRYREMIND 时，证件到期前30天及后180天提醒  配合 dealFlow = D；',
  \`RESTRAINTS_STATUS\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '限制状态|限制状态|A-已批准,E-已终止 ,F-未生效(限制开始日期未到，在将来的某天限制开始生效)',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`CLIENT_OPERATE_TYPE\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '操作交易号配置表|操作交易号配置表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_parameter
-- ----------------------------
DROP TABLE IF EXISTS \`cif_parameter\`;
CREATE TABLE \`cif_parameter\`  (
  \`PARA_KEY\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '参数名|参数名',
  \`PARA_VALUE\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '参数值|参数值',
  \`PARA_DESC\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '参数描述|参数描述',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易时间戳|交易时间戳',
  PRIMARY KEY (\`PARA_KEY\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = 'CIF技术参数表|CIF技术参数表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_qualification
-- ----------------------------
DROP TABLE IF EXISTS \`cif_qualification\`;
CREATE TABLE \`cif_qualification\`  (
  \`QUALIFICATION\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '专业职称|专业职称|0-无 , 1-初级, 2-中级, 3-高级, 9-未知',
  \`QUALIFICATION_DESC\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '职称描述|职称描述',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`QUALIFICATION\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '职称定义表|职称定义表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_real_control_info
-- ----------------------------
DROP TABLE IF EXISTS \`cif_real_control_info\`;
CREATE TABLE \`cif_real_control_info\`  (
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`CON_DOCUMENT_ID\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '控制人证件号码 |控制人证件号码',
  \`CON_DOCUMENT_TYPE\` varchar(3) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '控制人证件类型 |控制人证件类型',
  \`CON_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '控制人姓名 |控制人姓名',
  \`MATURITY_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '到期日期|证件的到期日期',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`CLIENT_NO\`, \`CON_DOCUMENT_ID\`, \`CON_DOCUMENT_TYPE\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '控股股东或控制人详细信息表|控股股东或控制人详细信息表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_relation_type
-- ----------------------------
DROP TABLE IF EXISTS \`cif_relation_type\`;
CREATE TABLE \`cif_relation_type\`  (
  \`RELATION_TYPE\` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '关系类型|关系类型|FQ-夫妻,HK-共同还款人,JT-集团总公司,ZG-集团子公司',
  \`JOINT_ACCT_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '联合账户标志|联合账户标志|Y-是 ,N-否',
  \`AUTHORISED_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '授权方|授权方|Y-已授权,N-未授权',
  \`INVERSE_RELA_TYPE\` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '反向关系类型|反向关系类型|FQ-夫妻,HK-共同还款人,JT-集团总公司,ZG-集团子公司',
  \`EQUITY_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '股权标志|股权|Y-是,N-不是',
  \`EXPOSURE_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '风险标志|风险标志|Y-是,N-否',
  \`JOIN_COLLAT_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '联合体标志|是否为联合体|Y-是 ,N-否',
  \`RELATION_TYPE_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '关系类型标识|关系类型标识|1-个人-个人,2-个人-非个人,3-非个人-非个人,4-非个人-个人,5-个人-非个人 或 非个人-非个人,6-非个人-非个人 或 非个人-个人',
  \`EMPLOYMENT_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '是否雇佣|是否雇佣|Y-是,N-否',
  \`RELATION_DESC\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '关系类型描述|关系类型描述',
  \`RELATIVE\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '是否亲戚|是否亲戚|Y-是,N-不是',
  \`SYMMENTRIC\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '对等|对等|Y-是,N-否',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`RELATION_TYPE\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户关系类型表|客户关系类型表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_resident_type
-- ----------------------------
DROP TABLE IF EXISTS \`cif_resident_type\`;
CREATE TABLE \`cif_resident_type\`  (
  \`RESIDENT_TYPE\` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '居住类型|居住类型|1-自置,2-按揭,3-亲属楼宇,4-集体宿舍,5-租房,6-共有住宅,7-其他,9-未知,11-自有,12-借住',
  \`RESIDENT_TYPE_DESC\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '居住类型说明|居住类型说明',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`RESIDENT_TYPE\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '居住类型表|居住类型表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_salutation
-- ----------------------------
DROP TABLE IF EXISTS \`cif_salutation\`;
CREATE TABLE \`cif_salutation\`  (
  \`SALUTATION\` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '称呼|称呼',
  \`SALUTATION_DESC\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '称呼代码说明|称呼代码说明',
  \`GENDER_FLAG\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '适用性别|适用性别|M-男,F-女,U-未知',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`SALUTATION\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '称呼类型表|称呼类型表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_segment
-- ----------------------------
DROP TABLE IF EXISTS \`cif_segment\`;
CREATE TABLE \`cif_segment\`  (
  \`SEGMENT_CODE\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '群组编号|客户群组编号',
  \`SEGMENT_CODE_DESC\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '群组名称|客户群组名称',
  \`SEGMENT_TYPE\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '群组类型|客户群组大类',
  \`SEGMENT_TYPE_DESC\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '群组类型名称|客户群组大类描述',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '法人|法人',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  PRIMARY KEY (\`SEGMENT_CODE\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户群组表|定义客户群组编码和描述' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_shared_phones
-- ----------------------------
DROP TABLE IF EXISTS \`cif_shared_phones\`;
CREATE TABLE \`cif_shared_phones\`  (
  \`CONTACT_TEL\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '联系电话  |联系电话',
  \`SHARED_CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '共用电话客户号|共用电话客户号',
  \`SHARED_CLIENT_SHORT\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '共享电话客户名称|共享电话客户名称',
  \`TRAN_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '交易日期|交易日期',
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`CTRL_BRANCH\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '控制分行|控制分行',
  \`TRAN_BRANCH\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易机构|交易机构',
  \`SOURCE_TYPE\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '渠道类型|渠道类型',
  \`PROGRAM_ID\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易代码|交易代码',
  \`SHARED_PHONES_STATUS\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '共用电话状态|有效状态|Y-有效,N-无效',
  \`USER_ID\` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '交易柜员|交易柜员',
  \`LAST_CHANGE_DATE\` datetime(0) NULL DEFAULT NULL COMMENT '最后修改日期|最后修改日期',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`CONTACT_TEL\`, \`SHARED_CLIENT_NO\`, \`CLIENT_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户共用电话(仅移动电话)表|客户共用电话(仅移动电话)表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cif_signatory
-- ----------------------------
DROP TABLE IF EXISTS \`cif_signatory\`;
CREATE TABLE \`cif_signatory\`  (
  \`CLIENT_NO\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '客户号|客户号',
  \`SIGNATORY_NO\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '签字人编号|签字人编号',
  \`SIGNATORY_NAME\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '签字人姓名|签字人姓名',
  \`SIGNATORY_DESC\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '签字人描述|签字人描述',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  PRIMARY KEY (\`CLIENT_NO\`, \`SIGNATORY_NO\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '客户签名表|客户签名表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for flyway_schema_history
-- ----------------------------
DROP TABLE IF EXISTS \`flyway_schema_history\`;
CREATE TABLE \`flyway_schema_history\`  (
  \`installed_rank\` int(0) NOT NULL,
  \`version\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL,
  \`description\` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  \`type\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  \`script\` varchar(1000) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  \`checksum\` int(0) NULL DEFAULT NULL,
  \`installed_by\` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  \`installed_on\` timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`execution_time\` int(0) NOT NULL,
  \`success\` tinyint(1) NOT NULL,
  PRIMARY KEY (\`installed_rank\`) USING BTREE,
  INDEX \`flyway_schema_history_s_idx\`(\`success\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for fm_bank
-- ----------------------------
DROP TABLE IF EXISTS \`fm_bank\`;
CREATE TABLE \`fm_bank\`  (
  \`BANK_CODE\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '银行代码|在同一个表中两个不同字段的中文注释都为银行代码',
  \`BANK_TYPE\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '银行类别|银行类别|O-我行,B-他行,S-建房互助协会,T-第三方银行',
  \`BANK_NAME\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '银行名称|银行名称',
  \`STATUS\` char(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '状态|状态|A-有效,F-无效,O-未过账,P-已过账',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  PRIMARY KEY (\`BANK_CODE\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '外部金融机构定义表|外部金融机构定义表，核心暂未使用' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for fm_bank_hierarchy
-- ----------------------------
DROP TABLE IF EXISTS \`fm_bank_hierarchy\`;
CREATE TABLE \`fm_bank_hierarchy\`  (
  \`HIERARCHY_CODE\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '层级代码|层级代码',
  \`HIERARCHY_NAME\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '层级说明|层级说明',
  \`HIERARCHY_LEVEL\` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '分行级别|分行级别',
  \`COMPANY\` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL COMMENT '法人|法人',
  \`TRAN_TIMESTAMP\` varchar(26) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '交易时间戳|交易时间戳',
  PRIMARY KEY (\`HIERARCHY_CODE\`) USING BTREE,
  INDEX \`IDX_FM_BANK_HIERARCHY_2\`(\`HIERARCHY_LEVEL\`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci COMMENT = '机构层次表|机构层次表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for fm_branch_ccy
-- ----------------------------
DROP TABLE IF EXISTS \`fm_branch_ccy\`;
CREATE TABLE \`fm_branch_ccy\`  (
  \`BRANCH\` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT '所属机构号|机构代码',
`;
