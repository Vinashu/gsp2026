
 public class GraphAdjMat {
	
	
	 private int Vcnt, Ecnt;
	 private final int Vmax;
	 private boolean digraph;
	 
	 private boolean adj[][];
	 
	 GraphAdjMat(int V, boolean flag)
	 	{
		 
		 	this.Vcnt=-1;
		    this.Vmax=V;
		    this.Ecnt=0;
		    
		    this.digraph=flag;
		    
		    adj= new boolean[V][V];
		 
	 	}
	 
	 
	public int V() { return Vcnt+1; }
	
	public int E(){ return Ecnt; }
	
	public boolean directed() { return digraph; }
	
	
	public void insertEdge (int v, int w)
		
		{
			
			if (v>Vcnt || w>Vcnt ) System.out.println("Sommet manquant");  
			
			else
			{	
				if (!adj[v][w]) Ecnt++;
				adj[v][w]=true;
			
				if (!digraph) adj[w][v]=true;
			
			}
			
		}
	
	
	
	public void insertVertex ()
	
	{
		this.Vcnt++;
		
	}

	
	public void insertVertex (int nb)
	
		{
		   
		   for (int i=0; i<nb; i++)
			  this.Vcnt++;
		
		}
	
	
	
	public void removeEdge(int v, int w)
	   
	{
		if (v>Vcnt || w>Vcnt ) System.out.println("Sommet manquant"); 
		
		else
			
			{
		
				if (adj[v][w]) Ecnt--;
		
				adj[v][w]=false;
		
				if (!digraph) adj[w][v]=false;
		
			}
		
		
	}
	
	
	public void ignorVertex(int v)
	   
	{
		
		for (int i=0; i<Vmax; i++)
		{
			 adj[i][v]=false;
			 adj[v][i]=false;
		
		}
		
		
		
	}
	
	
	
	
	public boolean edge(int v, int w)
	
	
	{
	     return adj[v][w];
	
	}
	
	
	
	public AdjList getAdjList(int v)
	
		{
			return new AdjArray(v);
		
		}
	

	
	
	private class AdjArray implements AdjList {
	
		private int i, v;
		
		AdjArray (int t)
			
			{
				this.v=t;
				i=-1;
			
			}
		
		
		public int beg()
			{
				i=-1;
				return nxt();
			
			}
		
		
		public int nxt()
			{
				
				for (i++; i<V(); i++)
					if (edge(v,i)) return i; 
				
				return -1;
				
			}
		
		
		public boolean end()
			
			{
				return i>= V();
			
			}
		
	}
	
	
	
	
	
	
	
}
 
 