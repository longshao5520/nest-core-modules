import { FilterQuery, Model, PipelineStage } from "mongoose";
import { ApiProperty } from "@nestjs/swagger";

export class PageBaseDto {
  @ApiProperty({ default: 1, description: "页码", required: false, type: "number" })
  page: number;

  @ApiProperty({ default: 10, description: "数量", required: false, type: "number" })
  size: number;
}

export type PaginatedResult<T> = {
  list: T[];
  total: number;
};

export type PaginateOption<T> = {
  model: Model<T>;
  query: FilterQuery<T>;
  page: number;
  size: number;
  sort?: Record<any, 1 | -1>;
  beforePipeline?: PipelineStage.FacetPipelineStage[];
  afterPipeline?: PipelineStage.FacetPipelineStage[];
  format?: (item: T) => T;
  isTotal?: boolean;
  cursor?: any;
};

const formatPageBody = (body: PageBaseDto) => {
  const skip = body.size * (body.page - 1) || 0;
  return { skip, limit: body.size || 10 };
};

export class PaginationUtils {
  static async paginate<T>(options: PaginateOption<T>): Promise<PaginatedResult<T>> {
    const { page, size, beforePipeline, afterPipeline, query, sort, model, format, isTotal = true } = options;
    const { skip, limit } = formatPageBody({ page, size });

    // 构建数据查询管道
    const dataPipeline: PipelineStage[] = [
      { $match: query },
      ...(beforePipeline || []),
      { $sort: sort || { _id: -1 } },
      { $skip: skip },
      { $limit: limit },
      ...(afterPipeline || []),
    ];

    let total = 0;
    let result: T[] = [];

    if (isTotal) {
      // 构建总数查询管道
      const countPipeline: PipelineStage[] = [{ $match: query }, ...(beforePipeline || []), { $count: "value" }];

      // 并行执行总数查询和数据查询
      const [countResult, dataResult] = await Promise.all([
        model.aggregate<{ value: number }>(countPipeline),
        model.aggregate<T>(dataPipeline),
      ]);

      total = countResult[0]?.value || 0;
      result = dataResult;
    } else {
      // 只执行数据查询
      result = await model.aggregate(dataPipeline);
    }

    return {
      list: result.map((item: T) => (format ? format(item) : item)),
      total,
    };
  }
}
